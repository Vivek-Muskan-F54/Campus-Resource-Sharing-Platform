package com.campusshare.service.impl;

import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import com.campusshare.domain.User;
import com.campusshare.dto.NoteDtos.NoteCreateRequest;
import com.campusshare.dto.NoteDtos.NoteModerationRequest;
import com.campusshare.dto.StorageUploadResult;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.ReputationService;
import com.campusshare.service.StorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class NoteServiceImplTest {

    private static final String EMAIL = "student@campus.edu";

    @Mock private NoteRepository notes;
    @Mock private UserRepository users;
    @Mock private ReputationService reputationService;
    @Mock private StorageService storage;

    @InjectMocks private NoteServiceImpl noteService;

    @Test
    @DisplayName("uploadPdf validates, uploads, and stores note metadata")
    void uploadPdf_createsNote() {
        User uploader = uploader();
        NoteCreateRequest request = new NoteCreateRequest(
                "  DBMS Notes  ",
                "  CSE  ",
                5,
                "  Database Systems  ",
                null);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "folder\\dbms notes.pdf",
                "application/pdf",
                "%PDF-1.7\n%".getBytes(StandardCharsets.UTF_8));
        StorageUploadResult uploadResult = new StorageUploadResult(
                "https://cdn.example.com/notes/dbms.pdf",
                "notes/dbms",
                "raw",
                2048L,
                "pdf");

        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(uploader));
        when(storage.upload(eq(file), eq("campus-share/notes"), eq("raw"))).thenReturn(uploadResult);
        when(notes.save(any(Note.class))).thenAnswer(invocation -> {
            Note note = invocation.getArgument(0);
            note.setId(501L);
            return note;
        });

        var response = noteService.uploadPdf(EMAIL, request, file);

        ArgumentCaptor<Note> noteCaptor = ArgumentCaptor.forClass(Note.class);
        verify(storage).upload(eq(file), eq("campus-share/notes"), eq("raw"));
        verify(notes).save(noteCaptor.capture());

        Note saved = noteCaptor.getValue();
        assertThat(saved.getUploader()).isSameAs(uploader);
        assertThat(saved.getTitle()).isEqualTo("DBMS Notes");
        assertThat(saved.getBranch()).isEqualTo("CSE");
        assertThat(saved.getSubject()).isEqualTo("Database Systems");
        assertThat(saved.getFileUrl()).isEqualTo("https://cdn.example.com/notes/dbms.pdf");
        assertThat(saved.getPublicId()).isEqualTo("notes/dbms");
        assertThat(saved.getOriginalFilename()).isEqualTo("folder_dbms_notes.pdf");
        assertThat(saved.getContentType()).isEqualTo("application/pdf");
        assertThat(saved.getFileSize()).isEqualTo(2048L);
        assertThat(saved.getStatus()).isEqualTo(ModerationStatus.PENDING);

        assertThat(response.id()).isEqualTo(501L);
        assertThat(response.fileUrl()).isEqualTo("https://cdn.example.com/notes/dbms.pdf");
        assertThat(response.originalFilename()).isEqualTo("folder_dbms_notes.pdf");
        assertThat(response.downloadCount()).isZero();
        assertThat(response.uploaderId()).isEqualTo(21L);
    }

    @Test
    @DisplayName("getDownloadUrlAndRecord increments the download count and returns the URL")
    void getDownloadUrlAndRecord_recordsDownload() {
        Note note = approvedNote(501L, uploader(), "https://cdn.example.com/notes/dbms.pdf");
        note.setDownloadCount(2);

        when(notes.findById(501L)).thenReturn(Optional.of(note));
        when(notes.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String url = noteService.getDownloadUrlAndRecord(501L);

        ArgumentCaptor<Note> noteCaptor = ArgumentCaptor.forClass(Note.class);
        verify(notes).save(noteCaptor.capture());
        assertThat(noteCaptor.getValue().getDownloadCount()).isEqualTo(3);
        assertThat(url).isEqualTo("https://cdn.example.com/notes/dbms.pdf");
    }

    @Test
    @DisplayName("search returns approved notes only")
    void search_returnsApprovedNotes() {
        Note note = approvedNote(501L, uploader(), "https://cdn.example.com/notes/dbms.pdf");
        when(notes.search(eq("dbms"), eq("cse"), eq(5), eq("database"), eq(ModerationStatus.APPROVED), any()))
                .thenReturn(new PageImpl<>(List.of(note)));

        Page<?> page = noteService.search("dbms", "cse", 5, "database", PageRequest.of(0, 10));

        assertThat(page).hasSize(1);
    }

    @Test
    @DisplayName("moderate updates the note status and remarks")
    void moderate_updatesNote() {
        Note note = approvedNote(501L, uploader(), "https://cdn.example.com/notes/dbms.pdf");
        when(notes.findById(501L)).thenReturn(Optional.of(note));
        when(notes.save(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = noteService.moderate(501L, new NoteModerationRequest(ModerationStatus.REJECTED, "Needs revision"));

        assertThat(response.status()).isEqualTo(ModerationStatus.REJECTED);
        assertThat(response.id()).isEqualTo(501L);
        assertThat(note.getModerationRemarks()).isEqualTo("Needs revision");
    }

    private static User uploader() {
        User user = new User();
        user.setId(21L);
        user.setName("Uploader");
        user.setEmail(EMAIL);
        user.setPassword("password");
        user.setCollegeRollNumber("UP-01");
        return user;
    }

    private static Note approvedNote(Long id, User uploader, String fileUrl) {
        Note note = new Note();
        note.setId(id);
        note.setUploader(uploader);
        note.setTitle("DBMS Notes");
        note.setBranch("CSE");
        note.setSemester(5);
        note.setSubject("Database Systems");
        note.setFileUrl(fileUrl);
        note.setStatus(ModerationStatus.APPROVED);
        note.setDownloadCount(0);
        return note;
    }
}

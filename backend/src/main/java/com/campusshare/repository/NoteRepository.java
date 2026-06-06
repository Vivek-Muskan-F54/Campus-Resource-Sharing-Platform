package com.campusshare.repository;

import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, Long> {
    @Query(
            value = """
                    select n from Note n
                    join fetch n.uploader
                    where (:status is null or n.status = :status)
                      and (:q is null or lower(n.title) like lower(concat('%', :q, '%'))
                           or lower(n.subject) like lower(concat('%', :q, '%')))
                      and (:branch is null or lower(n.branch) = lower(:branch))
                      and (:semester is null or n.semester = :semester)
                      and (:subject is null or lower(n.subject) like lower(concat('%', :subject, '%')))
                    """,
            countQuery = """
                    select count(n) from Note n
                    where (:status is null or n.status = :status)
                      and (:q is null or lower(n.title) like lower(concat('%', :q, '%'))
                           or lower(n.subject) like lower(concat('%', :q, '%')))
                      and (:branch is null or lower(n.branch) = lower(:branch))
                      and (:semester is null or n.semester = :semester)
                      and (:subject is null or lower(n.subject) like lower(concat('%', :subject, '%')))
                    """)
    Page<Note> search(
            @Param("q") String query,
            @Param("branch") String branch,
            @Param("semester") Integer semester,
            @Param("subject") String subject,
            @Param("status") ModerationStatus status,
            Pageable pageable);

    long countByStatus(ModerationStatus status);
}

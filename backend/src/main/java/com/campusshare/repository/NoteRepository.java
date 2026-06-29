package com.campusshare.repository;

import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

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

    @Query(
            value = """
                    select distinct n from Note n
                    join fetch n.uploader
                    where n.status = :status
                      and (
                            (:useBranchFilters = false and :useSubjectFilters = false)
                            or lower(n.branch) in :branches
                            or lower(n.subject) in :subjects
                      )
                    """,
            countQuery = """
                    select count(distinct n) from Note n
                    where n.status = :status
                      and (
                            (:useBranchFilters = false and :useSubjectFilters = false)
                            or lower(n.branch) in :branches
                            or lower(n.subject) in :subjects
                      )
                    """)
    Page<Note> findRecommendedCandidates(
            @Param("branches") Collection<String> branches,
            @Param("subjects") Collection<String> subjects,
            @Param("useBranchFilters") boolean useBranchFilters,
            @Param("useSubjectFilters") boolean useSubjectFilters,
            @Param("status") ModerationStatus status,
            Pageable pageable);

    @Query("""
            select distinct n from Note n
            join fetch n.uploader
            where n.id in :ids
              and n.status = :status
            """)
    List<Note> findAllWithUploaderByIdInAndStatus(
            @Param("ids") Collection<Long> ids,
            @Param("status") ModerationStatus status);

    @Query("""
            select n.uploader.id as userId, n.uploader.name as userName, count(n) as metric
            from Note n
            group by n.uploader.id, n.uploader.name
            order by count(n) desc, n.uploader.name asc
            """)
    List<UserLeaderboardView> findTopNoteUploaders(org.springframework.data.domain.Pageable pageable);

    long countByStatus(ModerationStatus status);
}

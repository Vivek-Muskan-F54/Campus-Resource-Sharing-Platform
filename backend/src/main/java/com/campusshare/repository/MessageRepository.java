package com.campusshare.repository;

import com.campusshare.domain.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    @Query(value = """
            select m from Message m
            join fetch m.sender
            join fetch m.recipient
            left join fetch m.product
            where (m.sender.id = :a and m.recipient.id = :b)
               or (m.sender.id = :b and m.recipient.id = :a)
            order by m.createdAt asc
            """,
            countQuery = """
            select count(m) from Message m
            where (m.sender.id = :a and m.recipient.id = :b)
               or (m.sender.id = :b and m.recipient.id = :a)
            """)
    Page<Message> conversation(@Param("a") Long a, @Param("b") Long b, Pageable pageable);

    @Query("""
            select distinct case
                when m.sender.id = :userId then m.recipient.id
                else m.sender.id
            end
            from Message m
            where m.sender.id = :userId or m.recipient.id = :userId
            """)
    List<Long> conversationPartnerIds(@Param("userId") Long userId);

    long countByRecipientIdAndReadFlagFalse(Long recipientId);

    @Modifying
    @Query("""
            update Message m
            set m.readFlag = true,
                m.readAt = current_timestamp
            where m.recipient.id = :recipientId
              and m.sender.id = :senderId
              and m.readFlag = false
            """)
    int markConversationRead(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);
}

package com.campusshare.service;

import com.campusshare.domain.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthMailService {
    private static final Logger log = LoggerFactory.getLogger(AuthMailService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;

    public void sendVerificationEmail(User user, String verificationUrl) {
        sendEmail(user, "Verify your email address", "auth/verify-email", Map.of(
                "name", user.getName(),
                "actionUrl", verificationUrl,
                "supportEmail", fromAddress
        ), "verification");
    }

    public void sendPasswordResetEmail(User user, String resetUrl) {
        sendEmail(user, "Reset your password", "auth/reset-password", Map.of(
                "name", user.getName(),
                "actionUrl", resetUrl,
                "supportEmail", fromAddress
        ), "password_reset");
    }

    private void sendEmail(User user, String subject, String template, Map<String, Object> variables, String eventType) {
        try {
            Context context = new Context(Locale.ENGLISH);
            variables.forEach(context::setVariable);
            String html = templateEngine.process(template, context);

            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setTo(user.getEmail());
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("event=auth_email_sent type={} user_id={}", eventType, user.getId());
        } catch (Exception ex) {
            log.warn("event=auth_email_send_failed type={} user_id={} reason={}", eventType, user.getId(), ex.getClass().getSimpleName());
        }
    }
}

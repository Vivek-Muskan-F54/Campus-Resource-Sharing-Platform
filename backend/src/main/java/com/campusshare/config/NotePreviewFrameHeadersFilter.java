package com.campusshare.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Locale;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class NotePreviewFrameHeadersFilter extends OncePerRequestFilter {

    private static final String PREVIEW_ORIGIN = "https://campus-resource-sharing-platform.vercel.app";
    private static final String PREVIEW_CSP =
            "default-src 'self'; " +
            "img-src 'self' https://res.cloudinary.com data:; " +
            "connect-src 'self' https://campus-resource-sharing-platform.vercel.app " +
            "https://campus-resource-sharing-platform.onrender.com " +
            "wss://campus-resource-sharing-platform.onrender.com; " +
            "frame-ancestors " + PREVIEW_ORIGIN;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isNotePreview(request)) {
            PreviewHeaderResponseWrapper wrapped = new PreviewHeaderResponseWrapper(response);
            filterChain.doFilter(request, wrapped);
            wrapped.setHeader("Content-Security-Policy", PREVIEW_CSP);
            wrapped.addHeader("Content-Security-Policy", PREVIEW_CSP);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isNotePreview(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri != null && uri.matches("^/api/notes/\\d+/preview$");
    }

    private static final class PreviewHeaderResponseWrapper extends HttpServletResponseWrapper {
        private PreviewHeaderResponseWrapper(HttpServletResponse response) {
            super(response);
        }

        @Override
        public void setHeader(String name, String value) {
            if (shouldSuppress(name)) {
                return;
            }
            super.setHeader(name, value);
        }

        @Override
        public void addHeader(String name, String value) {
            if (shouldSuppress(name)) {
                return;
            }
            super.addHeader(name, value);
        }

        @Override
        public void setIntHeader(String name, int value) {
            if (shouldSuppress(name)) {
                return;
            }
            super.setIntHeader(name, value);
        }

        @Override
        public void addIntHeader(String name, int value) {
            if (shouldSuppress(name)) {
                return;
            }
            super.addIntHeader(name, value);
        }

        @Override
        public void setDateHeader(String name, long date) {
            if (shouldSuppress(name)) {
                return;
            }
            super.setDateHeader(name, date);
        }

        @Override
        public void addDateHeader(String name, long date) {
            if (shouldSuppress(name)) {
                return;
            }
            super.addDateHeader(name, date);
        }

        private boolean shouldSuppress(String name) {
            if (name == null) {
                return false;
            }
            String normalized = name.toLowerCase(Locale.ROOT);
            return "x-frame-options".equals(normalized) || "content-security-policy".equals(normalized);
        }
    }
}

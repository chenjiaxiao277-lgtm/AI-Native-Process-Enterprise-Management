package com.tranyu.context;

/**
 * 当前请求登录主体上下文。
 */
public final class AuthSubjectContext {

    private static final ThreadLocal<AuthSubject> HOLDER = new ThreadLocal<>();

    private AuthSubjectContext() {
    }

    public static void set(AuthSubject subject) {
        HOLDER.set(subject);
    }

    public static AuthSubject get() {
        return HOLDER.get();
    }

    public static Long getCurrentUserId() {
        AuthSubject subject = HOLDER.get();
        return subject == null ? null : subject.getUserId();
    }

    public static String getCurrentUsername() {
        AuthSubject subject = HOLDER.get();
        return subject == null ? null : subject.getUsername();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public static final class AuthSubject {
        private final Long userId;
        private final String username;
        private final String token;

        public AuthSubject(Long userId, String username, String token) {
            this.userId = userId;
            this.username = username;
            this.token = token;
        }

        public Long getUserId() {
            return userId;
        }

        public String getUsername() {
            return username;
        }

        public String getToken() {
            return token;
        }
    }
}


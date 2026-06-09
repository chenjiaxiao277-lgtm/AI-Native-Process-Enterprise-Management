package com.tranyu.ai.crud.common.context;

/**
 * 平台认证主体上下文门面，复用现有线程上下文存储。
 */
public final class AuthSubjectContext {

    private AuthSubjectContext() {
    }

    public static void set(AuthSubject subject) {
        com.tranyu.context.AuthSubjectContext.set(
                new com.tranyu.context.AuthSubjectContext.AuthSubject(subject.getUserId(), subject.getUsername(), subject.getToken())
        );
    }

    public static AuthSubject get() {
        com.tranyu.context.AuthSubjectContext.AuthSubject subject = com.tranyu.context.AuthSubjectContext.get();
        if (subject == null) {
            return null;
        }
        return new AuthSubject(subject.getUserId(), subject.getUsername(), subject.getToken());
    }

    public static Long getCurrentUserId() {
        return com.tranyu.context.AuthSubjectContext.getCurrentUserId();
    }

    public static String getCurrentUsername() {
        return com.tranyu.context.AuthSubjectContext.getCurrentUsername();
    }

    public static void clear() {
        com.tranyu.context.AuthSubjectContext.clear();
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

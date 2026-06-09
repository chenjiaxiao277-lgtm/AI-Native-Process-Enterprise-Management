package com.tranyu.context;

/**
 * 当前请求空间上下文。
 */
public final class SpaceContext {

    private static final ThreadLocal<String> HOLDER = new ThreadLocal<>();

    private SpaceContext() {
    }

    public static void setCurrentSpaceId(String spaceId) {
        HOLDER.set(spaceId);
    }

    public static String getCurrentSpaceId() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}


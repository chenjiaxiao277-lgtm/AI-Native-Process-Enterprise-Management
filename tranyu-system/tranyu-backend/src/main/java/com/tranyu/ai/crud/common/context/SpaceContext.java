package com.tranyu.ai.crud.common.context;

/**
 * 平台空间上下文门面，复用现有线程上下文存储。
 */
public final class SpaceContext {

    private SpaceContext() {
    }

    public static void set(String spaceId) {
        com.tranyu.context.SpaceContext.set(spaceId);
    }

    public static String get() {
        return com.tranyu.context.SpaceContext.get();
    }

    public static void setCurrentSpaceId(String spaceId) {
        com.tranyu.context.SpaceContext.setCurrentSpaceId(spaceId);
    }

    public static String getCurrentSpaceId() {
        return com.tranyu.context.SpaceContext.getCurrentSpaceId();
    }

    public static void clear() {
        com.tranyu.context.SpaceContext.clear();
    }
}

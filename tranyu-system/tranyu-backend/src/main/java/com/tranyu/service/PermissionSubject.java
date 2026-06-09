package com.tranyu.service;

public class PermissionSubject {

    private final String type;
    private final String id;

    public PermissionSubject(String type, String id) {
        this.type = type;
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public String getId() {
        return id;
    }
}

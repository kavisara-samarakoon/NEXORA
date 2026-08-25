package com.nexora.api.auth.events;

public enum AuthSecurityEventType {
    REGISTER_SUCCESS,
    REGISTER_FAILURE,
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    REFRESH_SUCCESS,
    REFRESH_FAILURE,
    LOGOUT_REQUESTED,
    LOGOUT_COMPLETED,
    CSRF_ORIGIN_FAILURE
}

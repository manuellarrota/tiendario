package com.nugar.domain;

public enum SubscriptionPlan {
    BASIC(1),
    MEDIUM(3),
    PREMIUM(5);

    private final int defaultRegisterLimit;

    SubscriptionPlan(int defaultRegisterLimit) {
        this.defaultRegisterLimit = defaultRegisterLimit;
    }

    public int getDefaultRegisterLimit() {
        return defaultRegisterLimit;
    }
}

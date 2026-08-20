package com.nexora.api.wishlist;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WishlistAlertEvaluatorTests {

    @Test
    void marksTargetReachedWhenCurrentPriceIsBelowTarget() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("$8.88", "$9.99", true);

        assertAll(
                () -> assertTrue(evaluation.targetReached()),
                () -> assertEquals("target-reached", evaluation.state()),
                () -> assertEquals("Target price reached.", evaluation.message())
        );
    }

    @Test
    void keepsWatchingWhenCurrentPriceIsAboveTarget() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("$12.00", "$9.99", true);

        assertAll(
                () -> assertFalse(evaluation.targetReached()),
                () -> assertEquals("watching", evaluation.state()),
                () -> assertEquals("Still above target price.", evaluation.message())
        );
    }

    @Test
    void treatsFreeAsZero() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("FREE", "$0.00", true);

        assertTrue(evaluation.targetReached());
        assertEquals("target-reached", evaluation.state());
    }

    @Test
    void pausedTakesPrecedenceOverPriceParsing() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("$8.88", "$9.99", false);

        assertAll(
                () -> assertFalse(evaluation.targetReached()),
                () -> assertEquals("paused", evaluation.state()),
                () -> assertEquals("Alert is paused.", evaluation.message())
        );
    }

    @Test
    void tbaPriceIsNotEvaluable() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("TBA", "$9.99", true);

        assertNotEvaluable(evaluation);
    }

    @Test
    void blankOrNullPriceIsNotEvaluable() {
        assertAll(
                () -> assertNotEvaluable(
                        WishlistAlertEvaluator.evaluate(" ", "$9.99", true)),
                () -> assertNotEvaluable(
                        WishlistAlertEvaluator.evaluate("$8.88", null, true))
        );
    }

    @Test
    void parsesCommaSeparatedPrices() {
        WishlistAlertEvaluation evaluation =
                WishlistAlertEvaluator.evaluate("$1,299.99", "1300.00", true);

        assertTrue(evaluation.targetReached());
        assertEquals("target-reached", evaluation.state());
    }

    @Test
    void negativePricesAreNotEvaluable() {
        assertAll(
                () -> assertNotEvaluable(
                        WishlistAlertEvaluator.evaluate("-$1.00", "$0.00", true)),
                () -> assertNotEvaluable(
                        WishlistAlertEvaluator.evaluate("$1.00", "-2.00", true))
        );
    }

    private static void assertNotEvaluable(WishlistAlertEvaluation evaluation) {
        assertAll(
                () -> assertFalse(evaluation.targetReached()),
                () -> assertEquals("not-evaluable", evaluation.state()),
                () -> assertEquals("Price cannot be evaluated yet.", evaluation.message())
        );
    }
}

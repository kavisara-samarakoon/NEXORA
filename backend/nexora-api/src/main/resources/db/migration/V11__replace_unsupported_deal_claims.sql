UPDATE deals
SET status = CASE
    WHEN price_value = 0 THEN 'Free offer'
    WHEN discount_value >= 80 THEN 'Deep discount'
    WHEN discount_value >= 60 THEN 'Strong discount'
    WHEN discount_value >= 30 THEN 'Current offer'
    ELSE 'Observed offer'
END
WHERE status IN (
    'Historical Low',
    'Lowest Ever',
    'Great Deal',
    'Good Price',
    'Average',
    'Free Weekend'
);

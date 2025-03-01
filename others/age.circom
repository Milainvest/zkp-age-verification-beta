pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal output isAdult;

    // Calculate age
    signal yearDiff <== currentYear - birthYear;

    // Check if the person is 18 years or older
    component isOver18 = GreaterEqThan(12); // 12 bits is sufficient for comparing year differences
    isOver18.in[0] <== yearDiff;
    isOver18.in[1] <== 18;
    signal is18OrOlder <== isOver18.out;

    // Compare months and days (only needed when exactly 18 years old)
    component isSameOrLaterMonth = GreaterEqThan(4); // 4 bits is enough to represent months
    isSameOrLaterMonth.in[0] <== currentMonth;
    isSameOrLaterMonth.in[1] <== birthMonth;
    signal isMonthGreaterOrEqual <== isSameOrLaterMonth.out;

    component isSameOrLaterDay = GreaterEqThan(5); // 5 bits is enough to represent days
    isSameOrLaterDay.in[0] <== currentDay;
    isSameOrLaterDay.in[1] <== birthDay;
    signal isDayGreaterOrEqual <== isSameOrLaterDay.out;

    // Check if the age is exactly 18
    component isExactly18 = IsZero(); // Using IsZero component
    isExactly18.in <== 18 - yearDiff; // Will be 0 if the year difference is exactly 18
    signal is18Exactly <== isExactly18.out;
    log("is18Exactly", is18Exactly);

    // True if over 18, or exactly 18 and current date is after or equal to birth date
    signal monthDayCheck <== isMonthGreaterOrEqual * isDayGreaterOrEqual; // intermediate variable
    isAdult <== is18OrOlder + (is18Exactly * monthDayCheck);
    log("isAdult", isAdult);
}

component main = AgeCheck(); 
import { classifyLog } from "../../lib/logClassifier";
import logFixtures from "../fixtures/logs.json";

describe("Log Classifier", () => {
    it.each(logFixtures.errors)("should detect error pattern: %s", (log) => {
        expect(classifyLog(log)).toBe("error");
    });

    // Testing Warnings
    it.each(logFixtures.warnings)("should detect warning pattern: %s", (log) => {
        expect(classifyLog(log)).toBe("warn");
    });

    // Testing Info/Default
    it.each(logFixtures.info)("should default to info: %s", (log) => {
        expect(classifyLog(log)).toBe("info");
    });
});

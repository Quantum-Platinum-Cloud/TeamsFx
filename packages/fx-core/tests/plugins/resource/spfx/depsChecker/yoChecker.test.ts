// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import { stub, restore, assert } from "sinon";
import rewire from "rewire";

import fs from "fs-extra";

import { TestHelper } from "../helper";

import { telemetryHelper } from "../../../../../src/component/generator/spfx/utils/telemetry-helper";
import { YoChecker } from "../../../../../src/component/generator/spfx/depsChecker/yoChecker";
import { LogProvider, LogLevel, Colors, UserError } from "@microsoft/teamsfx-api";
import { cpUtils } from "../../../../../src/common/deps-checker/util/cpUtils";
import { createContextV3 } from "../../../../../src/component/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { MockTools } from "../../../../core/utils";

const ryc = rewire("../../../../../src/component/generator/spfx/depsChecker/yoChecker");

class StubLogger implements LogProvider {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    return true;
  }

  async trace(message: string): Promise<boolean> {
    return true;
  }

  async debug(message: string): Promise<boolean> {
    return true;
  }

  async info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    return true;
  }

  async warning(message: string): Promise<boolean> {
    return true;
  }

  async error(message: string): Promise<boolean> {
    return true;
  }

  async fatal(message: string): Promise<boolean> {
    return true;
  }

  getLogFilePath(): string {
    return "";
  }
}

describe("Yo checker", () => {
  beforeEach(() => {
    stub(telemetryHelper, "sendSuccessEvent").callsFake(() => {
      console.log("success event");
      return;
    });
    stub(telemetryHelper, "sendErrorEvent").callsFake(() => {
      console.log("error event");
      return;
    });
  });

  afterEach(() => {
    restore();
  });

  it("install", async () => {
    const yc = new YoChecker(new StubLogger());
    const cleanStub = stub(YoChecker.prototype, <any>"cleanup").callsFake(async () => {
      console.log("stub cleanup");
      return;
    });
    stub(cpUtils, "executeCommand").resolves();
    stub(fs, "pathExists").callsFake(async () => {
      return true;
    });

    try {
      await yc.install();
    } catch {
      assert.callCount(cleanStub, 2);
    }
  });

  it("install throw error", async () => {
    const yc = new YoChecker(new StubLogger());
    const cleanStub = stub(YoChecker.prototype, <any>"cleanup").callsFake(async () => {
      console.log("stub cleanup");
      return;
    });
    stub(cpUtils, "executeCommand").throws(new Error("unknown"));
    stub(fs, "pathExists").callsFake(async () => {
      return true;
    });

    try {
      await yc.install();
    } catch (e) {
      expect(e.name).equal("NpmInstallFailed");
    }
  });

  it("findGloballyInstalledVersion: returns version", async () => {
    const generatorChecker = new YoChecker(new StubLogger());
    stub(cpUtils, "executeCommand").resolves("C:\\Roaming\\npm\n`-- yo@4.3.1\n\n");

    const res = await generatorChecker.findGloballyInstalledVersion(1);
    expect(res).equal("4.3.1");
  });

  it("findGloballyInstalledVersion: regex error", async () => {
    const yoChecker = new YoChecker(new StubLogger());
    stub(cpUtils, "executeCommand").resolves(
      "C:\\Roaming\\npm\n`-- @microsoft/generator-sharepoint@1.16.1\n\n"
    );

    const res = await yoChecker.findGloballyInstalledVersion(1);
    expect(res).equal(undefined);
  });

  it("findLatestVersion: returns version", async () => {
    const yoChecker = new YoChecker(new StubLogger());
    stub(cpUtils, "executeCommand").resolves("4.3.1");

    const res = await yoChecker.findLatestVersion(1);
    expect(res).equal("4.3.1");
  });

  it("findLatestVersion: regex error", async () => {
    const yoChecker = new YoChecker(new StubLogger());
    stub(cpUtils, "executeCommand").resolves("empty");

    const res = await yoChecker.findLatestVersion(1);
    expect(res).to.be.undefined;
  });

  it("findLatestVersion: exeute commmand error", async () => {
    const yoChecker = new YoChecker(new StubLogger());
    stub(cpUtils, "executeCommand").throws("run command error");

    const res = await yoChecker.findLatestVersion(1);
    expect(res).to.be.undefined;
  });

  describe("isLatestInstalled", () => {
    it("is latest installed", async () => {
      const yc = new YoChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(YoChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "latest";
      });

      stub(YoChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest";
      });

      const result = await yc.isLatestInstalled();
      expect(result).is.true;
    });

    it("latest not installed", async () => {
      const yc = new YoChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(YoChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "lowerVersion";
      });

      stub(YoChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest version";
      });

      const result = await yc.isLatestInstalled();
      expect(result).is.false;
    });

    it("sentitel file missing", async () => {
      const yc = new YoChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return false;
      });

      stub(YoChecker.prototype, <any>"queryVersion").callsFake(async () => {
        console.log("stub queryversion");
        return "lowerVersion";
      });

      stub(YoChecker.prototype, <any>"findLatestVersion").callsFake(async () => {
        console.log("stub findLatestVersion");
        return "latest version";
      });

      const result = await yc.isLatestInstalled();
      expect(result).is.false;
    });

    it("throw error", async () => {
      const yc = new YoChecker(new StubLogger());
      stub(fs, "pathExists").callsFake(async () => {
        console.log("stub pathExists");
        return true;
      });

      stub(YoChecker.prototype, <any>"queryVersion").throws("error");

      const result = await yc.isLatestInstalled();
      expect(result).is.false;
    });
  });

  describe("ensureLatestDependency", () => {
    setTools(new MockTools());
    it("install successfully", async () => {
      const yc = new YoChecker(new StubLogger());

      stub(YoChecker.prototype, <any>"install").callsFake(async () => {
        console.log("installing");
      });

      const context = createContextV3();

      const result = await yc.ensureLatestDependency(context);
      expect(result.isOk()).to.be.true;
    });

    it("install error", async () => {
      const yc = new YoChecker(new StubLogger());
      stub(YoChecker.prototype, <any>"install").callsFake(async () => {
        throw new UserError("source", "name", "msg", "msg");
      });

      const context = createContextV3();

      const result = await yc.ensureLatestDependency(context);
      expect(result.isErr()).to.be.true;
    });
  });
});

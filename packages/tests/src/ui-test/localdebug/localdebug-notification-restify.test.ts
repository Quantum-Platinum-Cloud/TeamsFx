/**
 * @author Aocheng Wang <aochengwang@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../vscodeOperation";
import { initPage, validateNotificationBot } from "../../playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  LocalDebugTaskInfo,
} from "../../constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";

// TODO: Change preview test to normal test before rc release
describe("Restify Notification Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  const oldEnv = Object.assign({}, process.env);
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("restNoti");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env = oldEnv;
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[auto] Local debug Restify Notification Bot App",
    {
      testPlanCaseId: 13999815,
      author: "aochengwang@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.js");

      await startDebugging();

      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(
        LocalDebugTaskLabel.StartBotApp,
        LocalDebugTaskInfo.StartBotAppInfo
      );

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateNotificationBot(page);
    }
  );
});

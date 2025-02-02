/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import * as path from "path";
import { VSBrowser } from "vscode-extension-tester";
import { Timeout } from "../../constants";
import {
  RemoteDebugTestContext,
  runProvision,
  runPublish,
} from "./remotedebugContext";
import { execCommandIfExist, createNewProject } from "../../vscodeOperation";
import { it } from "../../utils/it";
import { cleanUpStagedPublishApp } from "../../utils/cleanHelper";

describe("Remote debug Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let remoteDebugTestContext: RemoteDebugTestContext;
  let testRootFolder: string;
  let appName: string;
  const appNameCopySuffix = "copy";
  let newAppFolderName: string;
  let projectPath: string;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    remoteDebugTestContext = new RemoteDebugTestContext("tab");
    testRootFolder = remoteDebugTestContext.testRootFolder;
    appName = remoteDebugTestContext.appName;
    newAppFolderName = appName + appNameCopySuffix;
    projectPath = path.resolve(testRootFolder, newAppFolderName);
    await remoteDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await remoteDebugTestContext.after();

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await remoteDebugTestContext.cleanUp(
      appName,
      projectPath,
      true,
      false,
      false
    );
  });

  it(
    "[auto] Publish to Teams",
    {
      testPlanCaseId: 9784092,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      //create tab project
      const driver = VSBrowser.instance.driver;
      await createNewProject("tab", appName);
      await runProvision(appName);
      await runPublish();
      await runPublish(true);
      const teamsAppId = await remoteDebugTestContext.getTeamsAppId(
        projectPath
      );
      await cleanUpStagedPublishApp(teamsAppId);
    }
  );
});

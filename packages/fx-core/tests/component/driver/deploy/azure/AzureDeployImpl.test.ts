// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Siglud <siglud@gmail.com>
 */

import "mocha";
import { DeployArgs } from "../../../../../src/component/driver/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import { TestLogProvider } from "../../../util/logProviderMock";
import { MockTelemetryReporter, MockUserInteraction } from "../../../../core/utils";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";
import { AzureZipDeployImpl } from "../../../../../src/component/driver/deploy/azure/impl/AzureZipDeployImpl";
import * as tools from "../../../../../src/common/tools";
import * as sinon from "sinon";
import { AzureDeployImpl } from "../../../../../src/component/driver/deploy/azure/impl/azureDeployImpl";
import {
  CheckDeploymentStatusError,
  CheckDeploymentStatusTimeoutError,
  DeployZipPackageError,
  GetPublishingCredentialsError,
} from "../../../../../src/error/deploy";
import * as chai from "chai";
import { MyTokenCredential } from "../../../../plugins/solution/util";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as appService from "@azure/arm-appservice";
import { RestError } from "@azure/storage-blob";
import {
  WebAppsListPublishingCredentialsResponse,
  WebSiteManagementClient,
} from "@azure/arm-appservice";
import { HttpStatusCode } from "../../../../../src/component/constant/commonConstant";
import { DeployStatus } from "../../../../../src/component/constant/deployConstant";

describe("AzureDeployImpl zip deploy acceleration", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("zip deploy need acceleration", async () => {
    const args = {
      workingDirectory: "./",
      artifactFolder: `./tmp`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    context.logProvider.info = async (msg: string | Array<any>) => {
      console.log(msg);
      return Promise.resolve(true);
    };
    const deploy = new AzureZipDeployImpl(args, context, "", "", [], []);
    sandbox.stub(deploy, "zipDeploy").resolves(5_000_000);
    await deploy.run();
  });

  it("checkDeployStatus empty response", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves(undefined);
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config, new TestLogProvider()))
      .to.be.rejectedWith(CheckDeploymentStatusTimeoutError);
  });

  it("checkDeployStatus 500 response", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
      data: {
        status: DeployStatus.Failed,
        message: "fail to start app due to some reasons.",
      },
    });
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config, new TestLogProvider()))
      .to.be.rejectedWith(CheckDeploymentStatusError);
  });

  it("checkDeployStatus reject AxiosError", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").rejects({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error: {
            code: "Request_BadRequest",
            message:
              "Invalid value specified for property 'displayName' of resource 'Application'.",
          },
        },
      },
    });
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config, new TestLogProvider()))
      .to.be.rejectedWith(CheckDeploymentStatusError);
  });
  it("checkDeployStatus reject none AxiosError", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").rejects(new Error("other error"));
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config, new TestLogProvider()))
      .to.be.rejectedWith(CheckDeploymentStatusError);
  });
  it("checkDeployStatus DeployRemoteStartError", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: HttpStatusCode.OK,
      data: {
        status: DeployStatus.Failed,
        message: "fail to start app due to some reasons.",
      },
    });
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const res = await impl.checkDeployStatus("", config, new TestLogProvider());
    chai.assert.equal(res?.status, DeployStatus.Failed);
    chai.assert.equal(res?.message, "fail to start app due to some reasons.");
  });
  it("checkDeployStatus return status 400", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: HttpStatusCode.BAD_REQUEST,
    });
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config, new TestLogProvider()))
      .to.be.rejectedWith(CheckDeploymentStatusError);
  });
  it("createAzureDeployConfig GetPublishingCredentialsError", async () => {
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      telemetryReporter: new MockTelemetryReporter(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const webApps = {
      beginListPublishingCredentialsAndWait: async function (
        resourceGroupName: string,
        name: string
      ): Promise<WebAppsListPublishingCredentialsResponse> {
        throw new RestError("test message", "111", 500);
      },
    };
    const mockWebSiteManagementClient = new WebSiteManagementClient(new MyTokenCredential(), "sub");
    mockWebSiteManagementClient.webApps = webApps as any;
    sandbox.stub(appService, "WebSiteManagementClient").returns(mockWebSiteManagementClient);
    const token = new MyTokenCredential();
    sandbox.stub(token, "getToken").throws(new Error("test message"));
    await chai
      .expect(
        impl.createAzureDeployConfig(
          {
            subscriptionId: "e24d88be-bbbb-1234-ba25-11111111111",
            resourceGroupName: "mockGroupName",
            instanceId: "mockAppName",
          },
          token
        )
      )
      .to.be.rejectedWith(GetPublishingCredentialsError);
  });

  it("zipDeployPackage DeployZipPackageError throw 500", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").rejects({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error: {
            code: "InternalServerError",
            message: "Internal server error",
          },
        },
      },
    });
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    await chai
      .expect(
        impl.zipDeployPackage("mockEndPoint", Buffer.alloc(1, ""), config, new TestLogProvider())
      )
      .to.be.rejectedWith(DeployZipPackageError);
  });
  it("zipDeployPackage DeployZipPackageError throw 404", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").rejects({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error: {
            code: "Request_BadRequest",
            message:
              "Invalid value specified for property 'displayName' of resource 'Application'.",
          },
        },
      },
    });
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    await chai
      .expect(
        impl.zipDeployPackage("mockEndPoint", Buffer.alloc(1, ""), config, new TestLogProvider())
      )
      .to.be.rejectedWith(DeployZipPackageError);
  });
  it("zipDeployPackage DeployZipPackageError return 500", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      headers: {
        location: "abc",
      },
      status: 500,
    });
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    await chai
      .expect(
        impl.zipDeployPackage("mockEndPoint", Buffer.alloc(1, ""), config, new TestLogProvider())
      )
      .to.be.rejectedWith(DeployZipPackageError);
  });

  it("throws Error when no basic auth allowed and AAD request fail", async () => {
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      telemetryReporter: new MockTelemetryReporter(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    process.env["TEAMSFX_AAD_DEPLOY_ONLY"] = "true";
    const webApps = {
      beginListPublishingCredentialsAndWait: async function (
        resourceGroupName: string,
        name: string
      ): Promise<WebAppsListPublishingCredentialsResponse> {
        throw new RestError("test message", "111", 500);
      },
    };
    const mockWebSiteManagementClient = new WebSiteManagementClient(new MyTokenCredential(), "sub");
    mockWebSiteManagementClient.webApps = webApps as any;
    sandbox.stub(appService, "WebSiteManagementClient").returns(mockWebSiteManagementClient);
    const token = new MyTokenCredential();
    sandbox.stub(token, "getToken").throws(new Error("test message"));
    await chai
      .expect(
        impl.createAzureDeployConfig(
          {
            subscriptionId: "e24d88be-bbbb-1234-ba25-11111111111",
            resourceGroupName: "mockGroupName",
            instanceId: "mockAppName",
          },
          token
        )
      )
      .to.be.rejectedWith(GetPublishingCredentialsError);
  });
});

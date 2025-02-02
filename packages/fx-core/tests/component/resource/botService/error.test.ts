// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zhijie <zhihuan@microsoft.com>
 */
import { assert } from "chai";
import "mocha";
import { getDefaultString } from "../../../../src/common/localizeUtils";
import {
  CreateAppError,
  CreateSecretError,
} from "../../../../src/component/resource/aadApp/errors";
import { ErrorNames } from "../../../../src/component/resource/botService/constants";
import {
  BotFrameworkForbiddenResultError,
  BotFrameworkNotAllowedToAcquireTokenError,
  CreateAADSecretError,
  ErrorType,
  CreateAADAppError,
  ConfigUpdatingError,
} from "../../../../src/component/resource/botService/errors";
import { Messages } from "../../../../src/component/resource/botService/messages";

describe("wrap error", () => {
  it("Increase UT - BotFrameworkNotAllowedToAcquireTokenError", () => {
    const e = new BotFrameworkNotAllowedToAcquireTokenError();
    assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);
  });

  it("Increase UT - BotFrameworkForbiddenResultError", () => {
    const e = new BotFrameworkForbiddenResultError();
    assert.isTrue(e.name === ErrorNames.FORBIDDEN_RESULT_BOT_FRAMEWORK_ERROR);
  });

  it("Increase UT - ConfigUpdatingError", () => {
    const e = new ConfigUpdatingError("anything");
    assert.isTrue(e.name === ErrorNames.CONFIG_UPDATING_ERROR);
  });

  it("Increase UT - genMessage & genDisplayMessage", () => {
    const e = new BotFrameworkNotAllowedToAcquireTokenError();
    assert.isTrue(e.name === ErrorNames.ACQUIRE_BOT_FRAMEWORK_TOKEN_ERROR);

    let expectedMsg = `${Messages.NotAllowedToAcquireBotFrameworkToken()[0]} `;
    expectedMsg += getDefaultString(
      "plugins.bot.ErrorSuggestions",
      [Messages.CheckOutputLogAndTryToFix].join(" ")
    );
    assert.isTrue(e.genMessage() === expectedMsg);

    let expectedDisplayMsg = `${Messages.NotAllowedToAcquireBotFrameworkToken()[1]} `;
    expectedDisplayMsg += getDefaultString(
      "plugins.bot.ErrorSuggestions",
      [Messages.CheckOutputLogAndTryToFix].join(" ")
    );
    assert.isTrue(e.genDisplayMessage() === expectedDisplayMsg);
  });

  it("Increase UT - CreateAADSecretError", () => {
    const e = new CreateAADSecretError({
      response: {
        status: 500,
        data: {
          error: {
            code: 500,
            message: "Hello500",
          },
        },
      },
    });
    assert.isTrue(e.name === CreateSecretError.name);
    assert.isTrue(e.errorType === ErrorType.SYSTEM);
  });

  it("Increase UT - CreateAADAppError", () => {
    const e = new CreateAADAppError({
      response: {
        status: 419,
        data: {
          error: {
            code: 419,
            message: "Hello419",
          },
        },
      },
    });
    assert.isTrue(e.name === CreateAppError.name);
    assert.isTrue(e.errorType === ErrorType.USER);
    assert.isTrue(e.details[0].endsWith("Hello419"));
  });
});

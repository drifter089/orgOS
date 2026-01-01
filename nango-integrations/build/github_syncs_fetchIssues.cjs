"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// nango-integrations/github/syncs/fetchIssues.ts
var fetchIssues_exports = {};
__export(fetchIssues_exports, {
  default: () => fetchIssues_default
});
module.exports = __toCommonJS(fetchIssues_exports);
var z = __toESM(require("zod"), 1);
var LIMIT = 100;
var issueSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  issue_number: z.number(),
  title: z.string(),
  state: z.string(),
  author: z.string(),
  author_id: z.number(),
  body: z.string(),
  date_created: z.string(),
  date_last_modified: z.string()
});
var sync = {
  type: "sync",
  description: `Fetches the Github issues from all a user's repositories.`,
  version: "1.0.0",
  endpoints: [{
    method: "GET",
    path: "/example/github/issues",
    group: "Issues"
  }],
  frequency: "every hour",
  autoStart: true,
  syncType: "full",
  metadata: z.void(),
  models: {
    GithubIssue: issueSchema
  },
  // Sync execution
  exec: async (nango) => {
    const repos = await getAllRepositories(nango);
    for (const repo of repos) {
      const proxyConfig = {
        endpoint: `/repos/${repo.owner.login}/${repo.name}/issues`,
        paginate: {
          limit: LIMIT
        }
      };
      for await (const issueBatch of nango.paginate(proxyConfig)) {
        const issues = issueBatch.filter((issue) => !("pull_request" in issue));
        const mappedIssues = issues.map((issue) => ({
          id: issue.id,
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issue.number,
          title: issue.title,
          state: issue.state,
          author: issue.user.login,
          author_id: issue.user.id,
          body: issue.body,
          date_created: issue.created_at,
          date_last_modified: issue.updated_at
        }));
        if (mappedIssues.length > 0) {
          await nango.batchSave(mappedIssues, "GithubIssue");
          await nango.log(`Sent ${mappedIssues.length} issues from ${repo.owner.login}/${repo.name}`);
        }
      }
    }
    await nango.deleteRecordsFromPreviousExecutions("GithubIssue");
  },
  // Webhook handler
  onWebhook: async (nango, payload) => {
    await nango.log("This is a webhook script", payload);
  }
};
var fetchIssues_default = sync;
async function getAllRepositories(nango) {
  const records = [];
  const proxyConfig = {
    endpoint: "/user/repos",
    paginate: {
      limit: LIMIT
    }
  };
  for await (const recordBatch of nango.paginate(proxyConfig)) {
    records.push(...recordBatch);
  }
  return records;
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmFuZ28taW50ZWdyYXRpb25zL2dpdGh1Yi9zeW5jcy9mZXRjaElzc3Vlcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgY3JlYXRlU3luYyB9IGZyb20gJ25hbmdvJztcbmltcG9ydCAqIGFzIHogZnJvbSAnem9kJztcbmNvbnN0IExJTUlUID0gMTAwO1xuY29uc3QgaXNzdWVTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGlkOiB6LnN0cmluZygpLFxuICBvd25lcjogei5zdHJpbmcoKSxcbiAgcmVwbzogei5zdHJpbmcoKSxcbiAgaXNzdWVfbnVtYmVyOiB6Lm51bWJlcigpLFxuICB0aXRsZTogei5zdHJpbmcoKSxcbiAgc3RhdGU6IHouc3RyaW5nKCksXG4gIGF1dGhvcjogei5zdHJpbmcoKSxcbiAgYXV0aG9yX2lkOiB6Lm51bWJlcigpLFxuICBib2R5OiB6LnN0cmluZygpLFxuICBkYXRlX2NyZWF0ZWQ6IHouc3RyaW5nKCksXG4gIGRhdGVfbGFzdF9tb2RpZmllZDogei5zdHJpbmcoKVxufSk7XG50eXBlIEdpdGh1Yklzc3VlID0gei5pbmZlcjx0eXBlb2YgaXNzdWVTY2hlbWE+O1xuY29uc3Qgc3luYyA9IHtcbiAgdHlwZTogXCJzeW5jXCIsXG4gIGRlc2NyaXB0aW9uOiBgRmV0Y2hlcyB0aGUgR2l0aHViIGlzc3VlcyBmcm9tIGFsbCBhIHVzZXIncyByZXBvc2l0b3JpZXMuYCxcbiAgdmVyc2lvbjogJzEuMC4wJyxcbiAgZW5kcG9pbnRzOiBbe1xuICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgcGF0aDogJy9leGFtcGxlL2dpdGh1Yi9pc3N1ZXMnLFxuICAgIGdyb3VwOiAnSXNzdWVzJ1xuICB9XSxcbiAgZnJlcXVlbmN5OiAnZXZlcnkgaG91cicsXG4gIGF1dG9TdGFydDogdHJ1ZSxcbiAgc3luY1R5cGU6ICdmdWxsJyxcbiAgbWV0YWRhdGE6IHoudm9pZCgpLFxuICBtb2RlbHM6IHtcbiAgICBHaXRodWJJc3N1ZTogaXNzdWVTY2hlbWFcbiAgfSxcbiAgLy8gU3luYyBleGVjdXRpb25cbiAgZXhlYzogYXN5bmMgbmFuZ28gPT4ge1xuICAgIGNvbnN0IHJlcG9zID0gYXdhaXQgZ2V0QWxsUmVwb3NpdG9yaWVzKG5hbmdvKTtcbiAgICBmb3IgKGNvbnN0IHJlcG8gb2YgcmVwb3MpIHtcbiAgICAgIGNvbnN0IHByb3h5Q29uZmlnID0ge1xuICAgICAgICBlbmRwb2ludDogYC9yZXBvcy8ke3JlcG8ub3duZXIubG9naW59LyR7cmVwby5uYW1lfS9pc3N1ZXNgLFxuICAgICAgICBwYWdpbmF0ZToge1xuICAgICAgICAgIGxpbWl0OiBMSU1JVFxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZm9yIGF3YWl0IChjb25zdCBpc3N1ZUJhdGNoIG9mIG5hbmdvLnBhZ2luYXRlKHByb3h5Q29uZmlnKSkge1xuICAgICAgICBjb25zdCBpc3N1ZXMgPSBpc3N1ZUJhdGNoLmZpbHRlcihpc3N1ZSA9PiAhKCdwdWxsX3JlcXVlc3QnIGluIGlzc3VlKSk7XG4gICAgICAgIGNvbnN0IG1hcHBlZElzc3VlczogR2l0aHViSXNzdWVbXSA9IGlzc3Vlcy5tYXAoaXNzdWUgPT4gKHtcbiAgICAgICAgICBpZDogaXNzdWUuaWQsXG4gICAgICAgICAgb3duZXI6IHJlcG8ub3duZXIubG9naW4sXG4gICAgICAgICAgcmVwbzogcmVwby5uYW1lLFxuICAgICAgICAgIGlzc3VlX251bWJlcjogaXNzdWUubnVtYmVyLFxuICAgICAgICAgIHRpdGxlOiBpc3N1ZS50aXRsZSxcbiAgICAgICAgICBzdGF0ZTogaXNzdWUuc3RhdGUsXG4gICAgICAgICAgYXV0aG9yOiBpc3N1ZS51c2VyLmxvZ2luLFxuICAgICAgICAgIGF1dGhvcl9pZDogaXNzdWUudXNlci5pZCxcbiAgICAgICAgICBib2R5OiBpc3N1ZS5ib2R5LFxuICAgICAgICAgIGRhdGVfY3JlYXRlZDogaXNzdWUuY3JlYXRlZF9hdCxcbiAgICAgICAgICBkYXRlX2xhc3RfbW9kaWZpZWQ6IGlzc3VlLnVwZGF0ZWRfYXRcbiAgICAgICAgfSkpO1xuICAgICAgICBpZiAobWFwcGVkSXNzdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBhd2FpdCBuYW5nby5iYXRjaFNhdmUobWFwcGVkSXNzdWVzLCAnR2l0aHViSXNzdWUnKTtcbiAgICAgICAgICBhd2FpdCBuYW5nby5sb2coYFNlbnQgJHttYXBwZWRJc3N1ZXMubGVuZ3RofSBpc3N1ZXMgZnJvbSAke3JlcG8ub3duZXIubG9naW59LyR7cmVwby5uYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGF3YWl0IG5hbmdvLmRlbGV0ZVJlY29yZHNGcm9tUHJldmlvdXNFeGVjdXRpb25zKCdHaXRodWJJc3N1ZScpO1xuICB9LFxuICAvLyBXZWJob29rIGhhbmRsZXJcbiAgb25XZWJob29rOiBhc3luYyAobmFuZ28sIHBheWxvYWQpID0+IHtcbiAgICBhd2FpdCBuYW5nby5sb2coJ1RoaXMgaXMgYSB3ZWJob29rIHNjcmlwdCcsIHBheWxvYWQpO1xuICB9XG59O1xuZXhwb3J0IHR5cGUgTmFuZ29TeW5jTG9jYWwgPSBQYXJhbWV0ZXJzPCh0eXBlb2Ygc3luYylbJ2V4ZWMnXT5bMF07XG5leHBvcnQgZGVmYXVsdCBzeW5jO1xuYXN5bmMgZnVuY3Rpb24gZ2V0QWxsUmVwb3NpdG9yaWVzKG5hbmdvOiBOYW5nb1N5bmNMb2NhbCk6IFByb21pc2U8YW55W10+IHtcbiAgY29uc3QgcmVjb3JkczogYW55W10gPSBbXTtcbiAgY29uc3QgcHJveHlDb25maWcgPSB7XG4gICAgZW5kcG9pbnQ6ICcvdXNlci9yZXBvcycsXG4gICAgcGFnaW5hdGU6IHtcbiAgICAgIGxpbWl0OiBMSU1JVFxuICAgIH1cbiAgfTtcbiAgZm9yIGF3YWl0IChjb25zdCByZWNvcmRCYXRjaCBvZiBuYW5nby5wYWdpbmF0ZShwcm94eUNvbmZpZykpIHtcbiAgICByZWNvcmRzLnB1c2goLi4ucmVjb3JkQmF0Y2gpO1xuICB9XG4gIHJldHVybiByZWNvcmRzO1xufSJd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

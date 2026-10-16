import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as projects from "@/app/api/projects/route";
import * as project from "@/app/api/projects/[id]/route";
import * as members from "@/app/api/projects/[id]/members/route";
import * as users from "@/app/api/users/route";
import * as userRoute from "@/app/api/users/[id]/route";
import { db } from "@/lib/db";
import { authenticate, createSession } from "@/lib/session";
import { getRequest, params, request, resetDb, setupTeam } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("projects", () => {
  it("lets only the owner create a project; all owners and the chosen managers become members", async () => {
    const { manager, ownerToken, managerToken } = await setupTeam();
    const denied = await projects.POST(request("POST", "/api/projects", managerToken, { name: "নতুন" }), {});
    expect(denied.status).toBe(403);

    const res = await projects.POST(
      request("POST", "/api/projects", ownerToken, { name: "নতুন", memberIds: [manager.id] }),
      {},
    );
    expect(res.status).toBe(201);
    const { project: created } = await res.json();
    expect(await db.projectMember.count({ where: { projectId: created.id } })).toBe(2);
  });

  it("lists only the projects the user is a member of", async () => {
    const { shared, ownerToken, managerToken } = await setupTeam();
    const owner = await (await projects.GET(getRequest("/api/projects", ownerToken), {})).json();
    const manager = await (await projects.GET(getRequest("/api/projects", managerToken), {})).json();
    expect(owner.projects).toHaveLength(2);
    expect(manager.projects.map((p: { id: string }) => p.id)).toEqual([shared.id]);
  });

  it("lets only the owner rename and archive", async () => {
    const { shared, ownerToken, managerToken } = await setupTeam();
    const ctx = params({ id: shared.id });
    const denied = await project.PATCH(
      request("PATCH", `/api/projects/${shared.id}`, managerToken, { isActive: false }),
      ctx,
    );
    expect(denied.status).toBe(403);

    const res = await project.PATCH(
      request("PATCH", `/api/projects/${shared.id}`, ownerToken, { name: "ফল", isActive: false }),
      params({ id: shared.id }),
    );
    expect((await res.json()).project).toMatchObject({ name: "ফল", isActive: false });
  });

  it("sets managers on a project and never removes owners", async () => {
    const { shared, owner, ownerToken, managerToken } = await setupTeam();
    const denied = await members.PUT(
      request("PUT", `/api/projects/${shared.id}/members`, managerToken, { userIds: [] }),
      params({ id: shared.id }),
    );
    expect(denied.status).toBe(403);

    const res = await members.PUT(
      request("PUT", `/api/projects/${shared.id}/members`, ownerToken, { userIds: [] }),
      params({ id: shared.id }),
    );
    expect((await res.json()).members.map((m: { id: string }) => m.id)).toEqual([owner.id]);

    // An owner id in the list is rejected: owners are not managed per project.
    const bad = await members.PUT(
      request("PUT", `/api/projects/${shared.id}/members`, ownerToken, { userIds: [owner.id] }),
      params({ id: shared.id }),
    );
    expect(bad.status).toBe(400);
  });
});

describe("users", () => {
  it("lets only the owner list and create users", async () => {
    const { shared, ownerToken, managerToken } = await setupTeam();
    expect((await users.GET(getRequest("/api/users", managerToken), {})).status).toBe(403);

    const res = await users.POST(
      request("POST", "/api/users", ownerToken, {
        name: "নতুন",
        phone: "০১৮১২৩৪৫৬৭৮",
        password: "pass123",
        role: "MANAGER",
        projectIds: [shared.id],
      }),
      {},
    );
    expect(res.status).toBe(201);
    const { user } = await res.json();
    expect(user).toMatchObject({ phone: "01812345678", role: "MANAGER" });
    expect(user.passwordHash).toBeUndefined();
    expect(await db.projectMember.count({ where: { userId: user.id } })).toBe(1);

    const dup = await users.POST(
      request("POST", "/api/users", ownerToken, {
        name: "x",
        phone: "01812345678",
        password: "pass123",
        role: "MANAGER",
      }),
      {},
    );
    expect((await dup.json()).error.code).toBe("PHONE_TAKEN");
  });

  it("adds a new owner to every project", async () => {
    const { ownerToken } = await setupTeam();
    const res = await users.POST(
      request("POST", "/api/users", ownerToken, {
        name: "দ্বিতীয় মালিক",
        phone: "01912345678",
        password: "pass123",
        role: "OWNER",
      }),
      {},
    );
    const { user } = await res.json();
    expect(await db.projectMember.count({ where: { userId: user.id, role: "OWNER" } })).toBe(2);
  });

  it("refuses to demote the last owner", async () => {
    const { owner, ownerToken } = await setupTeam();
    const res = await userRoute.PATCH(
      request("PATCH", `/api/users/${owner.id}`, ownerToken, { role: "MANAGER" }),
      params({ id: owner.id }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("LAST_OWNER");
  });

  it("logs a user out everywhere when the owner sets a new password", async () => {
    const { manager, ownerToken } = await setupTeam();
    const { token } = await createSession(manager.id);
    const res = await userRoute.PATCH(
      request("PATCH", `/api/users/${manager.id}`, ownerToken, { password: "new-pass" }),
      params({ id: manager.id }),
    );
    expect(res.status).toBe(200);
    expect(await authenticate(token)).toBeNull();
  });
});

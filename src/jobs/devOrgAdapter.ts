import { OrgAdapter } from "@/domain/org";

export const devOrgAdapter: OrgAdapter = {
  async fetchUsers() {
    return [
      {
        externalId: "u-1",
        email: "manager@example.com",
        name: "Manager User",
        active: true,
      },
      {
        externalId: "u-2",
        email: "submitter@example.com",
        name: "Submitter User",
        active: true,
      },
    ];
  },

  async fetchOrgUnits() {
    return [
      {
        externalId: "dept-1",
        name: "Operations",
        type: "department",
      },
    ];
  },

  async fetchMemberships() {
    return [
      {
        userExternalId: "u-1",
        orgUnitExternalId: "dept-1",
        roleInUnit: "head",
        isManager: true,
      },
      {
        userExternalId: "u-2",
        orgUnitExternalId: "dept-1",
        roleInUnit: "member",
        isManager: false,
      },
    ];
  },
};

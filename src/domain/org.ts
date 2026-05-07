export type ExternalUser = {
  externalId: string;
  email: string;
  name?: string;
  active: boolean;
};

export type ExternalOrgUnit = {
  externalId: string;
  name: string;
  type: string;
  parentExternalId?: string;
};

export type ExternalMembership = {
  userExternalId: string;
  orgUnitExternalId: string;
  roleInUnit?: string;
  isManager: boolean;
};

export interface OrgAdapter {
  fetchUsers(): Promise<ExternalUser[]>;
  fetchOrgUnits(): Promise<ExternalOrgUnit[]>;
  fetchMemberships(): Promise<ExternalMembership[]>;
}

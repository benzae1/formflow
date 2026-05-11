export type RoutingTarget =
  | { type: "role"; value: "admin" | "approver" | "compliance" }
  | { type: "org"; value: "submitter.manager" | "submitter.skip-level" | "department.head" }
  | { type: "user"; value: string }
  | { type: "group"; value: string };

export type WorkflowStageType =
  | "approval"
  | "notification"
  | "trigger-form"
  | "condition";

export type WorkflowStage = {
  id: string;
  name: string;
  type: WorkflowStageType;
  assignTo?: RoutingTarget | RoutingTarget[];
  childFormId?: string;
  conditions?: RoutingCondition[];
  sla?: {
    hours: number;
    reminderAt: number[];
  };
  onApprove?: "next-stage" | "close";
  onReject?: "close" | "return-to-submitter" | { goTo: string };
};

export type RoutingCondition = {
  expression: string;
};

export type WorkflowDefinition = WorkflowStage[];

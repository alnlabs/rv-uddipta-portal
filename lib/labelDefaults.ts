export const LABEL_DEFAULTS: Record<string, string> = {
  work_list: "Work list",
  work: "Work",
  duty: "Duty",
  regular_duty: "Regular duty",
  temporary_duty: "Temporary duty",
  role: "Role",
  roles: "Roles",
  duties_of_role: "Duties of this role",
  change_duties: "Change duties",
  save_duties: "Save duties",
  add_staff: "Add staff",
  create_staff: "Create staff",
  create_staff_help:
    "Phone + PIN for Security, Facility, Staff, and other society roles. Email is optional.",
  give_roles: "Give role(s)",
  extra_duty: "Extra duty",
  extra_duty_help:
    "Additional work for this person only, on top of duties from their roles.",
  save_extra_duty: "Save extra duty",
  people: "People",
  people_count: "{{count}} people",
  reminder: "Reminder",
  reminders: "Reminders",
  set_reminder: "Set reminder",
  working_as: "Working as",
  switch_role: "Switch role",
  keep_informed: "Keep informed",
  send_due_reminders: "Send due reminders",
  labels: "Labels",
  save_labels: "Save labels",
  default_label: "Default",
  name: "Name",
  summary: "Summary",
  type: "Type",
  add: "Add",
  save: "Save",
  saved: "Saved.",
  saving: "Saving…",
  sending: "Sending…",
  close: "Close",
  search: "Search",
  on: "On",
  off: "Off",
  turn_on: "Turn on",
  turn_off: "Turn off",
  standard: "Standard",
  custom: "Custom",
  inactive: "inactive",
  when: "When",
  date_time: "Date / time",
  minutes_before: "Minutes before start/end",
  repeat: "Repeat",
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  at_datetime: "At date/time",
  before_start: "Before start",
  before_end: "Before end",
  app_shell: "App shell (maps to)",
  starts_temporary: "Starts (temporary)",
  ends_temporary: "Ends (temporary)",
  select: "Select…",
  no_reminders_yet: "No reminders yet.",
  no_work_yet: "No work yet.",
  add_reminder_daily: "Add reminder (daily)",
  reminder_saved: "Reminder saved.",
  last_sent: "Last sent",
  who_does_what: "Who does what",
  help_work:
    "Make the work list — regular or temporary. Work can stand alone or be linked to a role.",
  help_roles: "Make roles and set duties of this role. You can change duties anytime.",
  help_people: "Add staff, give one or more roles, and optionally extra duty.",
  help_reminders:
    "Set reminders on work so people get a nudge on time. Keep informed sends a copy to society admins.",
  help_labels:
    "Change display words and help sentences used across Work, Roles, People, Areas, and Reminders.",
  help_who_does_what:
    "Work list → Roles (duties) → Add staff and give roles. Areas sets who looks after repairs for a period. Extra duty is only for that person. People who live in a home are added under Flats.",
  reminder_title: "Duty reminder",
  reminder_body: "Reminder: {{work}} — please check and complete this duty.",
  add_work: "Add work",
  add_role: "Add role",
  shell: "shell",
  areas: "Areas",
  who_looks_after: "Who looks after this",
  help_areas:
    "Set who looks after each area for a period. Admins stay informed. Gate stays with Security.",
  from_date: "From",
  until_date: "Until",
  current_owner: "Looking after it now",
};

export type SocietyLabels = Record<string, string>;

export function t(labels: SocietyLabels | null | undefined, key: string) {
  const value = labels?.[key]?.trim();
  if (value) return value;
  return LABEL_DEFAULTS[key] || key;
}

/** Replace {{name}} placeholders in an authorable string. */
export function tFill(
  labels: SocietyLabels | null | undefined,
  key: string,
  vars: Record<string, string | number>,
) {
  let out = t(labels, key);
  for (const [name, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${name}}}`, String(value));
  }
  return out;
}

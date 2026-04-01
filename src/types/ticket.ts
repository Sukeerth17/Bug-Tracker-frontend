export interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  department: string
  terraform?: string | null
  assignee?: string
}

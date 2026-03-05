import { useState } from "react"
import { Ticket } from "../types/ticket"

export function useTickets() {

  const [tickets, setTickets] = useState<Ticket[]>([])

  return {
    tickets,
    setTickets
  }
}
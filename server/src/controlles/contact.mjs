import { getTicket } from "../services/hubspot.mjs"

const getContact = async () =>{

 const ticketInfo = await getTicket()

}

module.exports = {getContact}
import { entriesPayload, json } from "../_lib/util.js";

export const onRequestGet = async ({ env }) => {
  return json(await entriesPayload(env.DB));
};

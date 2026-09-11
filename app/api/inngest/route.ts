import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { inngestFunctions } from "@/inngest/pipeline";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});

import { createClient } from "@supabase/supabase-js";

const projectUrl = "Project URL";
const anonkey = "ANON KEY";
let MySupabaseClient;
try {
  MySupabaseClient = createClient<any>(projectUrl, anonkey);
} catch (error) {
  //   console.log(error);
}
// console.log(MySupabaseClient);
export default MySupabaseClient;

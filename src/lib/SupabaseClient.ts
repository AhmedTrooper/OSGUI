import { createClient } from "@supabase/supabase-js";

const projectUrl = "PROJECT_URL_HERE";
const anonkey = "ANONKEY_HERE";
let MySupabaseClient;
try {
  MySupabaseClient = createClient<any>(projectUrl, anonkey);
} catch (error) {
  //   console.log(error);
}
// console.log(MySupabaseClient);
export default MySupabaseClient;

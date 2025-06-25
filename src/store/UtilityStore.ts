import { UtilityStoreInterface } from "@/interfaces/utility/UtilityStore";
import { create } from "zustand";

export const useUtilityStore = create<UtilityStoreInterface>(()=>({
parseBoolean:(value:boolean | "true" | "false")=>{
if(value===true || value ==="true"){
    return true;
} else {
    return false;
}
}
}));
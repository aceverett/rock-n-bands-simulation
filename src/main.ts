import "./styles.css";
import { RockNBandsApp } from "./ui/app";
import { ScormAdapter, restoreFromScorm } from "./lms/scorm";
import { loadState } from "./persistence/storage";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root not found.");

const lms = new ScormAdapter();
lms.initialize();
const resumeCandidate = restoreFromScorm(lms) ?? loadState();
new RockNBandsApp(root, resumeCandidate, lms);

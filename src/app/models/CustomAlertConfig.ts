import { CustomAlert } from "./CustomAlert";

export class CustomAlertConfig {
  name: string = '';
  email: string = '';
  time: string = '';
  enabled: boolean = true;
  targets: CustomAlert[] = [];
}
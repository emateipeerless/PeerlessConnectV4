import type { AccountInfo, IPublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "./authConfig";

export interface MicrosoftProfile {
  email: string;
  userKey: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export async function fetchMicrosoftProfile(
  instance: IPublicClientApplication,
  account: AccountInfo,
): Promise<MicrosoftProfile> {
  const tokenResponse = await instance.acquireTokenSilent({
    ...loginRequest,
    account,
  });

  const graphResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,givenName,surname,mail,userPrincipalName,mobilePhone,businessPhones",
    {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    },
  );

  if (!graphResponse.ok) {
    throw new Error("Failed to load profile from Microsoft Graph");
  }

  const data: {
    id?: string;
    givenName?: string;
    surname?: string;
    mail?: string;
    userPrincipalName?: string;
    mobilePhone?: string;
    businessPhones?: string[];
  } = await graphResponse.json();

  const email = (data.mail || data.userPrincipalName || account.username).trim().toLowerCase();
  const phone =
    data.mobilePhone ||
    (Array.isArray(data.businessPhones) && data.businessPhones[0]) ||
    "";

  return {
    email,
    userKey: data.id || account.localAccountId,
    firstName: data.givenName || "",
    lastName: data.surname || "",
    phone,
  };
}

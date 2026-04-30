import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const JWT_EXPIRY = "24h";

export type ExaminerActionPayload = {
  thesisRequestId: number;
  examinerId: number;
  action: "accept" | "reject";
  studentName: string;
  thesisTitle: string;
};

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "thesis-htw-berlin-secret-key-2026");
}

export async function signExaminerActionToken(payload: ExaminerActionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setSubject(`examiner-action-${payload.thesisRequestId}`)
    .sign(getSecret());
}

export async function verifyExaminerActionToken(
  token: string
): Promise<ExaminerActionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ExaminerActionPayload;
  } catch {
    return null;
  }
}

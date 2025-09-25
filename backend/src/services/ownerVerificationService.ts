import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dns from 'dns';
import { promisify } from 'util';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();
const resolveTxt = promisify(dns.resolveTxt);

export interface VerificationRequest {
  developerId: string;
  appId?: string;
  domain: string;
  verificationType: 'DNS_TXT' | 'META_TAG' | 'FILE_UPLOAD' | 'MANUAL_REVIEW';
}

export interface VerificationResult {
  success: boolean;
  verificationId: string;
  token?: string;
  message: string;
  expiresAt?: Date;
  instructions?: string;
}

export class OwnerVerificationService {
  private generateVerificationToken(): string {
    return `rapid-verify-${crypto.randomBytes(16).toString('hex')}`;
  }

  private calculateExpiryDate(): Date {
    // Verification tokens expire in 7 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    return expiryDate;
  }

  async initiateVerification(request: VerificationRequest): Promise<VerificationResult> {
    try {
      // Check if developer exists
      const developer = await prisma.developer.findUnique({
        where: { id: request.developerId }
      });

      if (!developer) {
        return {
          success: false,
          verificationId: '',
          message: 'Developer not found'
        };
      }

      // Check if app exists (if appId provided)
      if (request.appId) {
        const app = await prisma.app.findUnique({
          where: { id: request.appId }
        });

        if (!app || app.developerId !== request.developerId) {
          return {
            success: false,
            verificationId: '',
            message: 'App not found or does not belong to developer'
          };
        }
      }

      // Generate verification token
      const token = this.generateVerificationToken();
      const expiresAt = this.calculateExpiryDate();

      // Create verification proof record
      const verificationProof = await prisma.verificationProof.create({
        data: {
          developerId: request.developerId,
          appId: request.appId,
          verificationType: request.verificationType,
          domain: request.domain,
          verificationToken: token,
          status: 'PENDING',
          expiresAt,
          retryCount: 0,
          maxRetries: 3
        }
      });

      // Generate instructions based on verification type
      const instructions = this.generateInstructions(request.verificationType, token, request.domain);

      return {
        success: true,
        verificationId: verificationProof.id,
        token,
        message: 'Verification initiated successfully',
        expiresAt,
        instructions
      };

    } catch (error) {
      console.error('Error initiating verification:', error);
      return {
        success: false,
        verificationId: '',
        message: 'Failed to initiate verification'
      };
    }
  }

  private generateInstructions(type: string, token: string, domain: string): string {
    switch (type) {
      case 'DNS_TXT':
        return `Add the following TXT record to your domain's DNS settings:
        
Name: _rapid-verify
Value: ${token}
TTL: 300 (or default)

After adding the record, click "Verify" to complete the process. DNS changes may take up to 24 hours to propagate.`;

      case 'META_TAG':
        return `Add the following meta tag to the <head> section of your website's homepage (${domain}):

<meta name="rapid-verify" content="${token}" />

After adding the meta tag, click "Verify" to complete the process.`;

      case 'FILE_UPLOAD':
        return `Create a text file named "rapid-verify.txt" with the following content:

${token}

Upload this file to the root directory of your website so it's accessible at:
https://${domain}/rapid-verify.txt

After uploading the file, click "Verify" to complete the process.`;

      case 'MANUAL_REVIEW':
        return `Your verification request has been submitted for manual review. Our team will review your domain ownership and contact you within 2-3 business days.

Verification Token: ${token}`;

      default:
        return 'Please follow the verification instructions provided.';
    }
  }

  async verifyOwnership(verificationId: string): Promise<VerificationResult> {
    try {
      const verification = await prisma.verificationProof.findUnique({
        where: { id: verificationId },
        include: {
          developer: true,
          app: true
        }
      });

      if (!verification) {
        return {
          success: false,
          verificationId,
          message: 'Verification record not found'
        };
      }

      if (verification.status === 'VERIFIED') {
        return {
          success: true,
          verificationId,
          message: 'Domain already verified'
        };
      }

      if (verification.status === 'EXPIRED' || new Date() > verification.expiresAt) {
        await prisma.verificationProof.update({
          where: { id: verificationId },
          data: { status: 'EXPIRED' }
        });

        return {
          success: false,
          verificationId,
          message: 'Verification token has expired'
        };
      }

      if (verification.retryCount >= verification.maxRetries) {
        await prisma.verificationProof.update({
          where: { id: verificationId },
          data: { status: 'FAILED', failureReason: 'Maximum retry attempts exceeded' }
        });

        return {
          success: false,
          verificationId,
          message: 'Maximum verification attempts exceeded'
        };
      }

      // Perform verification based on type
      let verificationSuccess = false;
      let failureReason = '';

      switch (verification.verificationType) {
        case 'DNS_TXT':
          const dnsResult = await this.verifyDNS(verification.domain, verification.verificationToken);
          verificationSuccess = dnsResult.success;
          failureReason = dnsResult.error || '';
          break;

        case 'META_TAG':
          const metaResult = await this.verifyMetaTag(verification.domain, verification.verificationToken);
          verificationSuccess = metaResult.success;
          failureReason = metaResult.error || '';
          break;

        case 'FILE_UPLOAD':
          const fileResult = await this.verifyFile(verification.domain, verification.verificationToken);
          verificationSuccess = fileResult.success;
          failureReason = fileResult.error || '';
          break;

        case 'MANUAL_REVIEW':
          return {
            success: false,
            verificationId,
            message: 'Manual review is pending. Please wait for admin approval.'
          };

        default:
          failureReason = 'Invalid verification type';
      }

      if (verificationSuccess) {
        // Update verification as successful
        await prisma.verificationProof.update({
          where: { id: verificationId },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verificationData: JSON.stringify({
              verifiedAt: new Date().toISOString(),
              method: verification.verificationType
            })
          }
        });

        // Update developer domain verification status
        await prisma.developer.update({
          where: { id: verification.developerId },
          data: {
            isDomainVerified: true,
            domainVerificationMethod: verification.verificationType.toLowerCase()
          }
        });

        return {
          success: true,
          verificationId,
          message: 'Domain ownership verified successfully!'
        };
      } else {
        // Update retry count and failure reason
        await prisma.verificationProof.update({
          where: { id: verificationId },
          data: {
            retryCount: verification.retryCount + 1,
            failureReason,
            status: verification.retryCount + 1 >= verification.maxRetries ? 'FAILED' : 'PENDING'
          }
        });

        return {
          success: false,
          verificationId,
          message: failureReason || 'Verification failed'
        };
      }

    } catch (error) {
      console.error('Error verifying ownership:', error);
      return {
        success: false,
        verificationId,
        message: 'Verification process failed'
      };
    }
  }

  private async verifyDNS(domain: string, expectedToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const txtRecords = await resolveTxt(`_rapid-verify.${domain}`);
      
      for (const record of txtRecords) {
        const recordValue = Array.isArray(record) ? record.join('') : record;
        if (recordValue === expectedToken) {
          return { success: true };
        }
      }

      return { success: false, error: 'Verification token not found in DNS TXT records' };
    } catch (error) {
      return { success: false, error: `DNS lookup failed: ${error}` };
    }
  }

  private async verifyMetaTag(domain: string, expectedToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://${domain}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RapidTechStore-Verifier/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const metaTag = $('meta[name="rapid-verify"]').attr('content');

      if (metaTag === expectedToken) {
        return { success: true };
      }

      return { success: false, error: 'Verification meta tag not found or token mismatch' };
    } catch (error) {
      return { success: false, error: `Failed to fetch website: ${error}` };
    }
  }

  private async verifyFile(domain: string, expectedToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://${domain}/rapid-verify.txt`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RapidTechStore-Verifier/1.0'
        }
      });

      const fileContent = response.data.trim();
      if (fileContent === expectedToken) {
        return { success: true };
      }

      return { success: false, error: 'Verification file content does not match token' };
    } catch (error) {
      return { success: false, error: `Failed to fetch verification file: ${error}` };
    }
  }

  async getVerificationStatus(verificationId: string): Promise<any> {
    try {
      const verification = await prisma.verificationProof.findUnique({
        where: { id: verificationId },
        include: {
          developer: {
            select: {
              id: true,
              email: true,
              companyName: true
            }
          },
          app: {
            select: {
              id: true,
              name: true,
              packageName: true
            }
          }
        }
      });

      return verification;
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }

  async listVerifications(developerId: string): Promise<any[]> {
    try {
      const verifications = await prisma.verificationProof.findMany({
        where: { developerId },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              packageName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return verifications;
    } catch (error) {
      console.error('Error listing verifications:', error);
      return [];
    }
  }

  async deleteVerification(verificationId: string, developerId: string): Promise<boolean> {
    try {
      await prisma.verificationProof.deleteMany({
        where: {
          id: verificationId,
          developerId
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting verification:', error);
      return false;
    }
  }
}

export const ownerVerificationService = new OwnerVerificationService();
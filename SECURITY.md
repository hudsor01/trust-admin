# Security Policy

## Supported Versions

Trust Admin is currently in active development. Security updates are applied to the main branch.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Since this is a private repository for managing sensitive trust administration data, security is paramount.

### How to Report

1. **Email**: Send details to the repository owner at hudsor01@icloud.com
2. 2. **Expected Response**: You should receive acknowledgment within 48 hours
   3. 3. **Updates**: You'll receive updates on the investigation and remediation progress
     
      4. ### What to Include
     
      5. - Type of vulnerability
         - - Steps to reproduce
           - - Potential impact
             - - Suggested remediation (if applicable)
              
               - ## Security Considerations
              
               - This application handles sensitive financial and trust administration data. Key security features:
              
               - - **Authentication**: Better Auth with magic link email authentication
                 - - **Database**: PostgreSQL with parameterized queries (Drizzle ORM)
                   - - **Environment Variables**: Sensitive credentials stored in `.env` (never committed)
                     - - **Access Control**: Role-based access (admin/beneficiary)
                       - - **Session Management**: 7-day session expiration with refresh
                        
                         - ## Best Practices for Users
                        
                         - 1. **Never commit** `.env` files or credentials
                           2. 2. **Use strong database passwords** in production
                              3. 3. **Enable HTTPS** for production deployments
                                 4. 4. **Keep dependencies updated** (Dependabot enabled)
                                    5. 5. **Review Dependabot alerts** regularly

-- Industry Standard PJSIP AOR Configuration
-- Following Asterisk WebRTC Best Practices
-- Reference: https://docs.asterisk.org/Configuration/WebRTC/Configuring-Asterisk-for-WebRTC-Clients/

-- Update sysadmin AOR for dynamic WebRTC registration
-- contact = NULL: Allows Asterisk to auto-generate Contact header (required for WebSocket)
-- max_contacts = 5: Standard for WebRTC (allows multiple browser tabs)
-- qualify_frequency = 0: Disable OPTIONS ping (not needed for WebSocket)
UPDATE ps_aors 
SET 
  contact = NULL,
  max_contacts = 5,
  qualify_frequency = 0
WHERE id = 'sysadmin';

-- Verify configuration
\echo '=== Updated sysadmin AOR Configuration ==='
SELECT id, max_contacts, contact, qualify_frequency FROM ps_aors WHERE id = 'sysadmin';

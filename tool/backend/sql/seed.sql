-- seed.sql
-- Mock Data Insertion Scripts
-- 1. POSITIONS
INSERT INTO positions (name) VALUES 
('Information Officer'),
('Designated Officer'),
('Secretary'),
('Director General'),
('Legal Officer'),
('Administrative Assistant'),
('Research Analyst'),
('Public Relations Officer'),
('Chief Executive Officer'),
('Department Head');

-- 2. INSTITUTIONS
INSERT INTO institutions (name) VALUES 
('Ministry of Health'),
('Department of Education'),
('Central Environmental Authority'),
('Road Development Authority'),
('Sri Lanka Police'),
('National Water Supply & Drainage Board'),
('University of Colombo'),
('Sri Lanka Customs'),
('Ministry of Finance'),
('Public Service Commission');

-- 3. SENDERS
INSERT INTO senders (name, email, address, contact_no) VALUES 
('Amal Perera', NULL, NULL, '0771234567'),
('Bimali Silva', 'bimali.s@example.com', 'Gampaha', '0712345678'),
('Chamara Bandara', 'chamara.b@example.com', NULL, '0723456789'),
('Dilini Fernando', 'dilini.f@example.com', NULL, NULL),
('Eshani Jayawardena', 'eshani.j@example.com', NULL, '0785678901'),
('Fathima Nasreen', 'fathima.n@example.com', NULL, '0766789012'),
('Gayan Ratnayake', 'gayan.r@example.com', NULL, '0707890123'),
('Harsha Kumara', 'harsha.k@example.com', NULL, '0112345678'),
('Iromi Wickramasinghe', 'iromi.w@example.com', NULL, '0778901234'),
('Janaka Abeysekera', 'janaka.a@example.com', 'Colombo', '0719012345');

-- 4. RECEIVERS
-- Linking using subqueries to match existing data
INSERT INTO receivers (position_id, institution_id, email, address, contact_no) VALUES 
((SELECT id FROM positions WHERE name = 'Information Officer' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Ministry of Health' LIMIT 1), 'io.health@gov.lk', NULL, '0112444555'),
((SELECT id FROM positions WHERE name = 'Designated Officer' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Department of Education' LIMIT 1), 'do.edu@gov.lk', NULL, NULL),
((SELECT id FROM positions WHERE name = 'Secretary' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Central Environmental Authority' LIMIT 1), NULL, 'Colombo', '0112888999'),
((SELECT id FROM positions WHERE name = 'Director General' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Road Development Authority' LIMIT 1), 'dg.rda@gov.lk', 'Colombo', '0112000111'),
((SELECT id FROM positions WHERE name = 'Legal Officer' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Sri Lanka Police' LIMIT 1), NULL, NULL, '0112222333'),
((SELECT id FROM positions WHERE name = 'Administrative Assistant' LIMIT 1), (SELECT id FROM institutions WHERE name = 'National Water Supply & Drainage Board' LIMIT 1), 'admin.nwsdb@gov.lk', 'Colombo', '0112555666'),
((SELECT id FROM positions WHERE name = 'Research Analyst' LIMIT 1), (SELECT id FROM institutions WHERE name = 'University of Colombo' LIMIT 1), 'research.uoc@ac.lk', NULL, NULL),
((SELECT id FROM positions WHERE name = 'Public Relations Officer' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Sri Lanka Customs' LIMIT 1), 'pro.customs@gov.lk', 'Colombo', '0112111222'),
((SELECT id FROM positions WHERE name = 'Chief Executive Officer' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Ministry of Finance' LIMIT 1), 'ceo.finance@gov.lk', 'Gampaha', '0112999000'),
((SELECT id FROM positions WHERE name = 'Department Head' LIMIT 1), (SELECT id FROM institutions WHERE name = 'Public Service Commission' LIMIT 1), 'head.psc@gov.lk', 'Gampaha', NULL);

-- 5. RTI TEMPLATES
INSERT INTO rti_templates (title, description, file) VALUES 
('General Request Template', 'Template for general information requests from public authorities.', 'templates/general_request.pdf'),
('Education Data Request', 'Specific template for requesting student or staff statistics.', 'templates/edu_data.pdf'),
('Environmental Impact Inquiry', 'Template for inquiries regarding project environmental assessments.', 'templates/env_impact.pdf'),
('Infrastructure Project Details', 'Requesting budget and progress on road or building projects.', 'templates/infrastructure.pdf'),
('Public Service Vacancy Info', 'Template for inquiring about recruitment and vacancies.', 'templates/vacancies.pdf'),
('Health Statistics Request', 'Template for medical supply or service availability data.', 'templates/health_stats.pdf'),
('Financial Expenditure Inquiry', 'Template for detailed budgetary expenditure reports.', 'templates/finance_exp.pdf'),
('Customs Import/Export Data', 'Template for requesting historical trade data summaries.', 'templates/customs_data.pdf'),
('Water Supply Project Status', 'Template for inquiring about rural water supply schemes.', 'templates/water_project.pdf'),
('Legal Proceeding Inquiry', 'Standard template for updates on administrative legal matters.', 'templates/legal_query.pdf');

-- 6. RTI STATUSES
INSERT INTO rti_statuses (name) VALUES 
('SENT_FOR_APPROVAL'),
('APPROVED'),
('REJECTED'),
('SENT_TO_RECEIVER'),
('OTHER'),
('COMPLETED');

-- 7. RTI REQUESTS
INSERT INTO rti_requests (title, description, sender_id, receiver_id, rti_template_id) VALUES 
('Inquiry on Hospital Supplies', 'Requesting details of medicine availability for Colombo South Hospital.', (SELECT id FROM senders WHERE name = 'Amal Perera' LIMIT 1), (SELECT id FROM receivers WHERE email = 'io.health@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Health Statistics Request' LIMIT 1)),
('School Expenditure 2024', 'Requesting budget allocation for primary schools in Jaffna.', (SELECT id FROM senders WHERE name = 'Bimali Silva' LIMIT 1), (SELECT id FROM receivers WHERE email = 'do.edu@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Education Data Request' LIMIT 1)),
('Highway Project Budget', 'Details on the funding sources for the Central Expressway Phase III.', (SELECT id FROM senders WHERE name = 'Chamara Bandara' LIMIT 1), (SELECT id FROM receivers WHERE email = 'dg.rda@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Infrastructure Project Details' LIMIT 1)),
('Environmental Clearance List', 'Requesting a list of projects approved in wetlands during 2023.', (SELECT id FROM senders WHERE name = 'Dilini Fernando' LIMIT 1), (SELECT id FROM receivers WHERE contact_no = '0112888999' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Environmental Impact Inquiry' LIMIT 1)),
('Police Recruitment Ratio', 'Requesting data on gender ratio in recent constable recruitment.', (SELECT id FROM senders WHERE name = 'Eshani Jayawardena' LIMIT 1), (SELECT id FROM receivers WHERE contact_no = '0112222333' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Public Service Vacancy Info' LIMIT 1)),
('NWSDB Water Quality Data', 'Requesting seasonal water quality reports for Kandy district.', (SELECT id FROM senders WHERE name = 'Fathima Nasreen' LIMIT 1), (SELECT id FROM receivers WHERE email = 'admin.nwsdb@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Water Supply Project Status' LIMIT 1)),
('University Research Grants', 'Summary of research grants awarded to UoC faculty in 2025.', (SELECT id FROM senders WHERE name = 'Gayan Ratnayake' LIMIT 1), (SELECT id FROM receivers WHERE email = 'research.uoc@ac.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'General Request Template' LIMIT 1)),
('Customs Duty Exemptions', 'List of organizations granted duty exemptions for vehicle imports.', (SELECT id FROM senders WHERE name = 'Harsha Kumara' LIMIT 1), (SELECT id FROM receivers WHERE email = 'pro.customs@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Customs Import/Export Data' LIMIT 1)),
('Foreign Debt Repayment', 'Quarterly report on interest paid toward sovereign bonds.', (SELECT id FROM senders WHERE name = 'Iromi Wickramasinghe' LIMIT 1), (SELECT id FROM receivers WHERE email = 'ceo.finance@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Financial Expenditure Inquiry' LIMIT 1)),
('PSC Disciplinary Actions', 'Stats on administrative inquiries concluded in the last 6 months.', (SELECT id FROM senders WHERE name = 'Janaka Abeysekera' LIMIT 1), (SELECT id FROM receivers WHERE email = 'head.psc@gov.lk' LIMIT 1), (SELECT id FROM rti_templates WHERE title = 'Legal Proceeding Inquiry' LIMIT 1));

-- 8. RTI STATUS HISTORIES
-- Scenario 1: Inquiry on Hospital Supplies (Sent for Approval -> Approved -> Sent to Receiver)
INSERT INTO rti_status_histories (rti_request_id, status_id, direction, description, entry_time, exit_time, file) VALUES 
((SELECT id FROM rti_requests WHERE title = 'Inquiry on Hospital Supplies' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_FOR_APPROVAL' LIMIT 1), 'sent', 'Initial request submitted for internal approval.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 'requests/req_001.pdf'),
((SELECT id FROM rti_requests WHERE title = 'Inquiry on Hospital Supplies' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'APPROVED' LIMIT 1), 'sent', 'Request approved by the designated official.', NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'Inquiry on Hospital Supplies' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_TO_RECEIVER' LIMIT 1), 'sent', 'Request officially forwarded to the Ministry of Health.', NOW() - INTERVAL '8 days', NULL, NULL);

-- Scenario 2: School Expenditure 2024 (Sent for Approval -> Rejected -> Sent for Approval -> Approved -> Sent to Receiver -> Completed)
INSERT INTO rti_status_histories (rti_request_id, status_id, direction, description, entry_time, exit_time, file) VALUES 
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_FOR_APPROVAL' LIMIT 1), 'sent', 'Initial submission.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 'requests/req_002_v1.pdf'),
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'REJECTED' LIMIT 1), 'sent', 'Rejected: Missing required attachments.', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_FOR_APPROVAL' LIMIT 1), 'sent', 'Resubmitted with correct documents.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days', 'requests/req_002_v2.pdf'),
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'APPROVED' LIMIT 1), 'sent', 'Verified and approved.', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_TO_RECEIVER' LIMIT 1), 'sent', 'Sent to Dept of Education.', NOW() - INTERVAL '16 days', NOW() - INTERVAL '5 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'School Expenditure 2024' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'COMPLETED' LIMIT 1), 'received', 'Final response received and shared.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'responses/data_002.zip');

-- Scenario 3: Highway Project Budget (Sent for Approval -> Approved -> Sent to Receiver -> Other(received) -> Other(sent) ->  Completed)
INSERT INTO rti_status_histories (rti_request_id, status_id, direction, description, entry_time, exit_time, file) VALUES 
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_FOR_APPROVAL' LIMIT 1), 'sent', 'Initial request submitted.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 'requests/req_003.pdf'),
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'APPROVED' LIMIT 1), 'sent', 'Internal approval granted.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_TO_RECEIVER' LIMIT 1), 'sent', 'Forwarded to RDA.', NOW() - INTERVAL '13 days', NOW() - INTERVAL '10 days', NULL),
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'OTHER' LIMIT 1), 'received', 'Receiver requested clarification on project phase.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', 'clarifications/RDA_query.pdf'),
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'OTHER' LIMIT 1), 'sent', 'Clarification provided and forwarded.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days', 'clarifications/RDA_reply.pdf'),
((SELECT id FROM rti_requests WHERE title = 'Highway Project Budget' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'COMPLETED' LIMIT 1), 'received', 'Final report issued.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'responses/final_report_003.pdf');

-- Scenario 4: Environmental Clearance List (Sent for Approval -> Approved -> Sent to Receiver)
INSERT INTO rti_status_histories (rti_request_id, status_id, direction, description, entry_time, exit_time, file) VALUES 
((SELECT id FROM rti_requests WHERE title = 'Environmental Clearance List' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_FOR_APPROVAL' LIMIT 1), 'sent', 'New request waiting for review.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'requests/req_004.pdf'),
((SELECT id FROM rti_requests WHERE title = 'Environmental Clearance List' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'APPROVED' LIMIT 1), 'sent', 'Approved by Senior Secretary.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', NULL),
((SELECT id FROM rti_requests WHERE title = 'Environmental Clearance List' LIMIT 1), (SELECT id FROM rti_statuses WHERE name = 'SENT_TO_RECEIVER' LIMIT 1), 'sent', 'Emailed to CEA.', NOW() - INTERVAL '1 hour', NULL, NULL);



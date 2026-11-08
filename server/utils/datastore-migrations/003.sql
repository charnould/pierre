INSERT INTO setup (id, content)
SELECT 'repayment/plan.docx', content
FROM setup
WHERE id = 'repayment/template.docx'
  AND NOT EXISTS (SELECT 1 FROM setup WHERE id = 'repayment/plan.docx');

DELETE FROM setup WHERE id = 'repayment/template.docx';

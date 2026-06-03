from pptx import Presentation
import os
t = os.getenv('DELOITTE_TEMPLATE_PATH', '/app/Deloitte_Template.pptx')
prs = Presentation(t)
found = False
for shape in prs.slide_master.shapes:
    if shape.name == 'TextBox 2' and shape.shape_type == 17:
        found = True
        print('TextBox 2 EXISTS in master - page number still there')
        break
if not found:
    print('TextBox 2 NOT FOUND in master - this is correct template state')
print('Note: removal happens at generation time, not on template file itself')

import re
import sys

with open('/home/owais/reli/frontend/src/components/crm/LeadView.tsx', 'r') as f:
    content = f.read()

# We need to extract all blocks between 
#             <div className="space-y-6">
# and 
#             </div>
#           )}
#         </div>

start_marker = '            <div className="space-y-6">\n'
end_marker = '            </div>\n          )}\n        </div>\n'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries")
    sys.exit(1)

inner = content[start_idx + len(start_marker):end_idx]

# Split inner by `{/* `
chunks = inner.split('              {/* ')

header_space = chunks[0]
blocks = {}

for chunk in chunks[1:]:
    title = chunk.split(' */}')[0].strip()
    full_text = '              {/* ' + chunk
    blocks[title] = full_text

# Define desired order
order = [
    'Identification',
    'Contact',
    'Address',
    'Links',
    'Company Summary',
    'Apollo Company Data',
    'Apollo Decision Makers',
    'AI Reasoning',
    'AI Strategic Insights',
    'Email Drafts',
    'Notes',
    'Tags',
    'Activity',
    'Timestamps'
]

# We explicitly exclude 'CRM Signals', 'Raw Data', 'Firecrawl Raw Data'

new_inner = header_space
for title in order:
    if title in blocks:
        new_inner += blocks[title]

new_content = content[:start_idx + len(start_marker)] + new_inner + content[end_idx:]

with open('/home/owais/reli/frontend/src/components/crm/LeadView.tsx', 'w') as f:
    f.write(new_content)

print("Done reordering")


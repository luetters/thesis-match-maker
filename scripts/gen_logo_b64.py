import base64, json
with open('/home/ubuntu/webdev-static-assets/HTW_Berlin_Logo.jpg', 'rb') as f:
    data = base64.b64encode(f.read()).decode()
out = f'export const HTW_LOGO_BASE64 = "data:image/jpeg;base64,{data}";\n'
with open('/home/ubuntu/thesis-match-maker/client/src/lib/htwLogo.ts', 'w') as f:
    f.write(out)
print("Done, length:", len(data))

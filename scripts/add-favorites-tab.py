import re

path = "/home/ubuntu/thesis-match-maker/client/src/pages/StudentDashboard.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Heart-Icon zu Icons2 hinzufügen
old = "  profile: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={1.5} d=\"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\" /></svg>,\n};"
new = "  profile: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={1.5} d=\"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\" /></svg>,\n  heart: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={1.5} d=\"M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z\" /></svg>,\n};"
content = content.replace(old, new, 1)

# 2. Merkliste-NavItem einfügen
old = '    { href: "/student/history", label: t.student.history, icon: Icons2.history },\n    { href: "/student/profile", label: t.student.tabProfile, icon: Icons2.profile },'
new = '    { href: "/student/history", label: t.student.history, icon: Icons2.history },\n    { href: "/student/favorites", label: "Merkliste", icon: Icons2.heart },\n    { href: "/student/profile", label: t.student.tabProfile, icon: Icons2.profile },'
content = content.replace(old, new, 1)

# 3. activeTab-Typ erweitern
old = '  const [activeTab, setActiveTab] = useState<"requests" | "new" | "examiners" | "colloquiums" | "history" | "profile">('
new = '  const [activeTab, setActiveTab] = useState<"requests" | "new" | "examiners" | "colloquiums" | "history" | "favorites" | "profile">('
content = content.replace(old, new, 1)

# 4. location-Erkennung
old = '    location === "/student/history" ? "history" :\n    location === "/student/profile" ? "profile" : "requests"'
new = '    location === "/student/history" ? "history" :\n    location === "/student/favorites" ? "favorites" :\n    location === "/student/profile" ? "profile" : "requests"'
content = content.replace(old, new, 1)

# 5. onClick-Handler
old = '      else if (item.href === "/student/history") setActiveTab("history");\n      else if (item.href === "/student/profile") setActiveTab("profile");'
new = '      else if (item.href === "/student/history") setActiveTab("history");\n      else if (item.href === "/student/favorites") setActiveTab("favorites");\n      else if (item.href === "/student/profile") setActiveTab("profile");'
content = content.replace(old, new, 1)

# 6. titles-Objekt
old = '    history: t.student.tabHistory,\n    profile: t.student.tabProfile,'
new = '    history: t.student.tabHistory,\n    favorites: "Merkliste",\n    profile: t.student.tabProfile,'
content = content.replace(old, new, 1)

# 7. Tab-Rendering
old = '      {activeTab === "history" && <StatusHistory />}\n      {activeTab === "profile" && <Profile embedded={true} />}'
new = '      {activeTab === "history" && <StatusHistory />}\n      {activeTab === "favorites" && <FavoritesList />}\n      {activeTab === "profile" && <Profile embedded={true} />}'
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("Done – all replacements applied")

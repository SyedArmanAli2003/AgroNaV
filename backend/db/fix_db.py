import sqlite3, hashlib

conn = sqlite3.connect("agronav.db")
c = conn.cursor()

# 1. Add missing columns to users
for sql in [
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'rep'",
    "ALTER TABLE users ADD COLUMN manager_id INTEGER",
]:
    try:
        c.execute(sql)
        print("Added:", sql[:50])
    except Exception as e:
        print("Skip (exists):", str(e)[:60])

c.execute("UPDATE users SET role='rep' WHERE role IS NULL OR role=''")
print("Updated roles:", c.rowcount)

# 2. Update retailer names with readable display names
SHOP_WORDS = ["Agro","Krishi","Farm","Seeds","Kisan","Shakti","Sona","Bharat","India","Green","Prakash","Raj","Jai","Shree"]
SHOP_TYPES = ["Store","Traders","Suppliers","Center","Depot","Kendra","Agency","Mart","Enterprises","Point"]

c.execute("SELECT retailer_id, tehsil FROM retailers")
rows = c.fetchall()
updates = []
for rid, tehsil in rows:
    h = int(hashlib.md5(rid.encode()).hexdigest(), 16)
    word = SHOP_WORDS[h % len(SHOP_WORDS)]
    stype = SHOP_TYPES[(h // len(SHOP_WORDS)) % len(SHOP_TYPES)]
    district = tehsil.split("_T")[0] if tehsil and "_T" in tehsil else (tehsil or "")
    display_name = f"{district} {word} {stype}" if district else f"{word} {stype}"
    updates.append((display_name, rid))

c.executemany("UPDATE retailers SET retailer_name=? WHERE retailer_id=?", updates)
print(f"Updated {len(updates)} retailer names")
conn.commit()

# 3. Verify
c.execute("SELECT retailer_id, retailer_name, district FROM retailers WHERE district='Jalgaon' LIMIT 5")
print("Sample Jalgaon retailers:")
for r in c.fetchall():
    print(" ", r)

c.execute("SELECT id, name, rep_id, role, district FROM users")
print("Users:")
for u in c.fetchall():
    print(" ", u)

conn.close()
print("Done.")

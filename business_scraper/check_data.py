import sys
sys.path.insert(0, '.')
import pandas as pd

df = pd.read_csv('c:/Users/letss/OneDrive/Desktop/GitHub/7-Kaam/Data_Scraped/google_maps_businesses.csv',
                 dtype={'phone_number': str})

print("=" * 60)
print(f"  Total Records:     {len(df)}")
print(f"  Phone populated:   {df['phone_number'].notna().sum()}/{len(df)}")
print(f"  Address populated: {df['address'].notna().sum()}/{len(df)}")
print(f"  Rating populated:  {df['rating'].notna().sum()}/{len(df)}")
print(f"  Website populated: {df['website'].notna().sum()}/{len(df)}")
print(f"  Lat/Lng:           {df['latitude'].notna().sum()}/{len(df)}")
print(f"  Open Now:          {df['open_now'].notna().sum()}/{len(df)}")
print(f"  Hours:             {df['opening_hours'].notna().sum()}/{len(df)}")
print("=" * 60)
print()

cols = ['business_name', 'phone_number', 'rating', 'business_status']
pd.set_option('display.max_colwidth', 45)
pd.set_option('display.width', 140)
print(df[cols].to_string(index=True))
print()
print("Sample addresses:")
for i, row in df.head(5).iterrows():
    print(f"  [{i}] {row['business_name'][:35]:35s} | {str(row['address'])[:60]}")

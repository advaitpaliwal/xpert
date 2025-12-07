#!/usr/bin/env python3
"""
Fetch profile picture URLs for X profiles
Reads x_profiles_found.json and creates hackathon_members.json with profile pictures
"""

import json
import os
import time
from typing import Optional
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1

# Load environment variables from parent directory
load_dotenv('/Users/advaitpaliwal/Projects/xpert/.env.local')

# Configuration
CONSUMER_KEY = os.getenv('X_CONSUMER_KEY')
CONSUMER_SECRET = os.getenv('X_CONSUMER_SECRET')
ACCESS_TOKEN = os.getenv('X_ACCESS_TOKEN')
ACCESS_TOKEN_SECRET = os.getenv('X_ACCESS_TOKEN_SECRET')

X_USERS_BY_USERNAME_ENDPOINT = 'https://api.x.com/2/users/by/username/{}'
RATE_LIMIT_DELAY = 1  # seconds between requests
INPUT_FILE = 'x_profiles_found.json'
OUTPUT_FILE = 'hackathon_members.json'


def get_oauth_auth():
    """Create OAuth 1.0a authentication"""
    return OAuth1(
        CONSUMER_KEY,
        CONSUMER_SECRET,
        ACCESS_TOKEN,
        ACCESS_TOKEN_SECRET
    )


def fetch_user_profile_pic(username: str) -> Optional[str]:
    """
    Fetch profile picture URL for a given username
    Returns profile_image_url or None if error
    """
    if not all([CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET]):
        print("ERROR: OAuth 1.0a credentials not found in environment variables")
        return None

    auth = get_oauth_auth()
    url = X_USERS_BY_USERNAME_ENDPOINT.format(username)
    params = {
        'user.fields': 'profile_image_url'
    }

    try:
        response = requests.get(url, auth=auth, params=params)

        if response.status_code == 200:
            data = response.json()
            user_data = data.get('data', {})
            profile_image_url = user_data.get('profile_image_url', '')

            # X API returns profile images in low resolution (_normal),
            # we can get higher resolution by replacing _normal with _400x400
            if profile_image_url and '_normal' in profile_image_url:
                profile_image_url = profile_image_url.replace('_normal', '_400x400')

            return profile_image_url
        elif response.status_code == 429:
            print(f"  ⚠️ Rate limit hit, waiting 60 seconds...")
            time.sleep(60)
            return fetch_user_profile_pic(username)  # Retry
        else:
            print(f"  ❌ Error {response.status_code} for @{username}: {response.text}")
            return None

    except Exception as e:
        print(f"  ❌ Exception during API call for @{username}: {e}")
        return None


def process_profiles():
    """Main processing loop"""
    print(f"Starting Profile Picture Fetcher...")
    print(f"Reading from: {INPUT_FILE}")
    print(f"Output will be saved to: {OUTPUT_FILE}")
    print("-" * 60)

    if not all([CONSUMER_KEY, CONSUMER_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET]):
        print("\n❌ ERROR: Please set OAuth 1.0a credentials in your .env.local file")
        return

    try:
        # Read existing profiles
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            profiles = json.load(f)

        print(f"Found {len(profiles)} profiles to process\n")

        hackathon_members = []

        for idx, profile in enumerate(profiles, 1):
            username = profile.get('username')
            full_name = profile.get('full_name', profile.get('original_name', ''))
            profile_url = profile.get('profile_url', '')

            # Skip entries without valid username
            if not username or username in ['NOT_FOUND', 'ERROR']:
                print(f"[{idx}/{len(profiles)}] Skipping: {profile.get('original_name')} (no valid username)")
                continue

            print(f"[{idx}/{len(profiles)}] Fetching profile pic for: @{username}")

            # Fetch profile picture
            profile_image_url = fetch_user_profile_pic(username)

            if profile_image_url:
                print(f"  ✓ Got profile pic: {profile_image_url}")
            else:
                print(f"  ⚠️ Could not fetch profile pic, using placeholder")
                # Use a default X profile icon as fallback
                profile_image_url = "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"

            # Create member entry
            member = {
                'username': username,
                'full_name': full_name,
                'profile_url': profile_url,
                'profile_image_url': profile_image_url
            }
            hackathon_members.append(member)

            # Save incrementally
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(hackathon_members, f, indent=2, ensure_ascii=False)

            # Rate limiting
            time.sleep(RATE_LIMIT_DELAY)

        # Summary
        print("\n" + "-" * 60)
        print(f"✅ Summary:")
        print(f"  Total profiles processed: {len(profiles)}")
        print(f"  Members with profile pics: {len(hackathon_members)}")
        print(f"\n📁 Results saved to: {OUTPUT_FILE}")

    except FileNotFoundError:
        print(f"❌ ERROR: Could not find {INPUT_FILE}")
        print(f"   Please make sure {INPUT_FILE} exists in the current directory")
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: Invalid JSON in {INPUT_FILE}: {e}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    process_profiles()

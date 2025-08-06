# OriginOS Setup Configuration Guide

## 🎯 Overview

This guide contains **ALL** the manual configuration steps needed to complete the three core tasks:
1. ✅ Authentication & Registration (Auth0)
2. ✅ Subscription & Payment (Stripe)  
3. ✅ Model API Integration

**After completing these steps, your OriginOS will be fully functional!**

---

## 📦 Step 1: Install Required Dependencies

Run these commands in your project root:

```bash
# Auth0 Dependencies
npm install @auth0/nextjs-auth0

# Stripe Dependencies  
npm install stripe @stripe/stripe-js

# AWS S3 Dependencies
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Verify existing dependencies are installed
npm install openai framer-motion zustand lucide-react
```

---

## 🔐 Step 2: Auth0 Configuration

### 2.1 Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new **Regular Web Application**
3. Configure the following settings:

**Application Settings:**
- **Name**: OriginOS
- **Application Type**: Regular Web Application
- **Token Endpoint Authentication Method**: POST

**Application URIs:**
- **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

### 2.2 Environment Variables

Add these to your `.env.local` file:

```bash
# Auth0 Configuration
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='your_client_id_from_auth0'
AUTH0_CLIENT_SECRET='your_client_secret_from_auth0'
```

### 2.3 Auth0 Custom Claims (Optional)

To store subscription info in Auth0, create a Rule in Auth0 Dashboard:

```javascript
function addCustomClaims(user, context, callback) {
  const namespace = 'https://originx.ai/';
  context.idToken[namespace + 'subscription_tier'] = user.user_metadata.subscription_tier || 'free';
  context.idToken[namespace + 'voice_credits'] = user.user_metadata.voice_credits || 6000;
  context.idToken[namespace + 'total_usage'] = user.user_metadata.total_usage || 0;
  callback(null, user, context);
}
```

---

## 💳 Step 3: Stripe Configuration

### 3.1 Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your API keys from **Developers > API Keys**

### 3.2 Create Products and Prices

Create these products in Stripe Dashboard:

**Basic Plan:**
- Product Name: "OriginOS Basic"
- Monthly Price: $9.90 USD/month
- Yearly Price: $99 USD/year (~17% discount)
- Credits: 500,000 per month
- Copy both Price IDs

**Pro Plan:**
- Product Name: "OriginOS Pro"  
- Monthly Price: $19.90 USD/month
- Yearly Price: $199 USD/year (~17% discount)
- Credits: 1,000,000 per month
- Copy both Price IDs

### 3.3 Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_SECRET_KEY='sk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'

# Stripe Price IDs (from products created above)
STRIPE_BASIC_PRICE_ID='price_...'
STRIPE_BASIC_YEARLY_PRICE_ID='price_...'
STRIPE_PRO_PRICE_ID='price_...'
STRIPE_PRO_YEARLY_PRICE_ID='price_...'
```

### 3.4 Webhook Configuration

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `http://localhost:3000/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

---

## 🤖 Step 4: AI Model API Configuration

### 4.1 OpenAI Configuration

Add to your `.env.local`:

```bash
# OpenAI API
OPENAI_API_KEY='sk-...'
```

### 4.2 Flux Models Configuration

1. Go to the Flux platform website and create an account
2. Navigate to your API Keys section in the dashboard
3. Create a new API key and copy it
4. Add to your `.env.local`:

```bash
# Flux API Key
FAL_API_KEY='your_flux_api_key'
```

This configuration enables access to multiple Flux models:
- Flux Pro 1.1 (Latest version with improved quality)
- Flux Pro 1.0 (Legacy version)

### 4.3 ElevenLabs Configuration

Add to your `.env.local`:

```bash
# ElevenLabs Voice API
NEXT_PUBLIC_ELEVENLABS_API_KEY='your_elevenlabs_api_key'
NEXT_PUBLIC_ELEVENLABS_VOICE_ID='your_preferred_voice_id'
```

**To get ElevenLabs Voice ID:**
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Choose a voice from the Voice Library
3. Copy the Voice ID from the voice settings

---

## ☁️ Step 5: AWS S3 Configuration

### 5.1 Create AWS S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Create a new bucket with these settings:
   - **Bucket name**: Choose a unique name (e.g., `originx-content-storage`)
   - **Region**: Choose your preferred region
   - **Block Public Access**: Uncheck "Block all public access" (for public content)
   - **Bucket Versioning**: Enable (recommended)

### 5.2 Configure IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user with programmatic access
3. Attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### 5.3 Environment Variables

Add to your `.env.local`:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID='your_aws_access_key'
AWS_SECRET_ACCESS_KEY='your_aws_secret_key'
AWS_REGION='your_aws_region'
AWS_S3_BUCKET_NAME='your_bucket_name'
```

---

## 🚀 Step 6: Final Configuration

### 5.1 Complete Environment File

Your final `.env.local` should look like this:

```bash
# Auth0 Configuration
AUTH0_SECRET='your_32_byte_secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='your_auth0_client_id'
AUTH0_CLIENT_SECRET='your_auth0_client_secret'

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_SECRET_KEY='sk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'
STRIPE_BASIC_PRICE_ID='price_...'
STRIPE_BASIC_YEARLY_PRICE_ID='price_...'
STRIPE_PRO_PRICE_ID='price_...'
STRIPE_PRO_YEARLY_PRICE_ID='price_...'

# AWS S3 Configuration
AWS_ACCESS_KEY_ID='your_aws_access_key'
AWS_SECRET_ACCESS_KEY='your_aws_secret_key'
AWS_REGION='your_aws_region'
AWS_S3_BUCKET_NAME='your_bucket_name'

# AI Model APIs
OPENAI_API_KEY='sk-...'
FAL_API_KEY='your_fal_api_key'
NEXT_PUBLIC_ELEVENLABS_API_KEY='your_elevenlabs_key'
NEXT_PUBLIC_ELEVENLABS_VOICE_ID='your_voice_id'
```

### 5.2 Test the Application

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
# Test the complete flow:
# 1. Click "Start Exploration" → Should redirect to Auth0 login
# 2. Register/Login → Should redirect to mode selector
# 3. Choose Voice Mode → Should redirect to conversation
# 4. Try voice features → Should work with credit tracking
# 5. Exhaust free credits → Should show upgrade modal
```

---

## ✅ Verification Checklist

### Authentication ✅
- [ ] Users can register/login via Auth0
- [ ] After login, users see mode selector
- [ ] Mode selector routes to conversation correctly

### Subscription ✅  
- [ ] Free users get 6,000 credits per month
- [ ] Features are limited when credits exhausted
- [ ] Upgrade modal appears when credits run out
- [ ] Stripe checkout works for Basic/Pro plans with monthly/yearly options

### AI Models ✅
- [ ] Text generation works (OpenAI GPT)
- [ ] Voice synthesis works (ElevenLabs)
- [ ] Image generation works (Flux)
- [ ] Cost tracking is working

---

## 🔧 Troubleshooting

### Common Issues

**Auth0 Login Fails:**
- Check `AUTH0_ISSUER_BASE_URL` format
- Verify callback URLs in Auth0 dashboard
- Ensure `AUTH0_SECRET` is properly generated

**Stripe Checkout Fails:**
- Verify Price IDs are correct
- Check webhook endpoint is accessible
- Ensure test mode keys are used for development

**Voice Synthesis Fails:**
- Verify ElevenLabs API key is valid
- Check voice ID exists
- Ensure API key has sufficient credits

**Image Generation Fails:**
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure model access permissions

---

## 🎉 Success!

After completing all steps, your OriginOS will have:

✅ **Complete user authentication** with Auth0  
✅ **Full subscription management** with Stripe  
✅ **AI model integration** with cost tracking  
✅ **Voice credit limiting** and upgrade prompts  
✅ **Seamless user experience** from registration to AI interaction

Your application is now **production-ready** for the core features!

---

## 📞 Support

If you encounter issues:

1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Test each service independently (Auth0, Stripe, OpenAI, ElevenLabs)
4. Review the API documentation for each service

**All code is implemented and ready - you just need to configure the external services!**

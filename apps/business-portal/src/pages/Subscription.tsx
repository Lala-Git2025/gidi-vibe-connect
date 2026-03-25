import { Check, Zap, Crown, Star } from 'lucide-react';
import { useBusinessAuth } from '../contexts/BusinessAuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const PLANS = [
  {
    tier: 'Free',
    price: '₦0',
    period: 'forever',
    icon: Star,
    color: 'text-muted-foreground',
    borderClass: 'border-border',
    features: [
      '1 venue listing',
      '5 events per month',
      '5 photos per venue',
      'Basic venue profile',
      'Consumer app visibility',
    ],
    missing: ['Analytics dashboard', 'Priority listing', 'Offers & promotions', 'Menu management'],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    tier: 'Premium',
    price: '₦15,000',
    period: 'per month',
    icon: Zap,
    color: 'text-yellow-500',
    borderClass: 'border-yellow-500',
    badge: 'Most Popular',
    features: [
      '3 venue listings',
      '20 events per month',
      '20 photos per venue',
      'Analytics dashboard',
      'Priority listing in app',
      'Offers & promotions',
      'Featured placement',
    ],
    missing: ['Menu management', 'Dedicated account manager'],
    cta: 'Upgrade to Premium',
    ctaDisabled: false,
  },
  {
    tier: 'Enterprise',
    price: '₦50,000',
    period: 'per month',
    icon: Crown,
    color: 'text-purple-500',
    borderClass: 'border-purple-500',
    features: [
      'Unlimited venues',
      'Unlimited events',
      'Unlimited photos',
      'Full analytics suite',
      'Priority listing',
      'Offers & promotions',
      'Menu management',
      'Dedicated account manager',
      'Custom integrations',
    ],
    missing: [],
    cta: 'Contact Sales',
    ctaDisabled: false,
  },
];

export default function Subscription() {
  const { subscription } = useBusinessAuth();
  const currentTier = subscription?.tier || 'Free';

  const handleUpgrade = (tier: string) => {
    if (tier === 'Enterprise') {
      window.open('mailto:business@gidivibe.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    // TODO: Integrate Paystack/Stripe payment here
    alert(`Payment integration coming soon! Contact business@gidivibe.com to upgrade to ${tier}.`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and unlock more features</p>
      </div>

      {/* Current plan banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-bold">{currentTier}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Venues</p>
              <p className="font-semibold">{subscription?.max_venues ?? 1} max</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Events/month</p>
              <p className="font-semibold">{subscription?.max_events_per_month ?? 5} max</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Analytics</p>
              <p className="font-semibold">{subscription?.can_view_analytics ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.tier === currentTier;
          return (
            <Card key={plan.tier} className={`relative flex flex-col ${isCurrent ? 'ring-2 ring-primary' : ''} border ${plan.borderClass}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className={`flex items-center gap-2 ${plan.color}`}>
                  <Icon className="w-5 h-5" />
                  <CardTitle className="text-xl">{plan.tier}</CardTitle>
                </div>
                <div>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-4">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center">–</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={plan.ctaDisabled || isCurrent}
                  onClick={() => !isCurrent && handleUpgrade(plan.tier)}
                >
                  {isCurrent ? 'Current Plan' : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. You can cancel your subscription at any time. Your plan stays active until the end of the billing period.' },
            { q: 'How do I upgrade?', a: 'Contact us at business@gidivibe.com or click the upgrade button above. Payment via Paystack (card, bank transfer) is coming soon.' },
            { q: 'What happens to my data if I downgrade?', a: 'Your data is preserved. If you exceed the lower tier limits, existing venues/events remain but you cannot create new ones until within limits.' },
            { q: 'Do you offer annual billing?', a: 'Yes — annual billing gives you 2 months free. Contact us at business@gidivibe.com for annual pricing.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b last:border-0 pb-4 last:pb-0">
              <p className="font-medium text-sm">{q}</p>
              <p className="text-sm text-muted-foreground mt-1">{a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

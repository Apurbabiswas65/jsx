
// src/app/terms/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-foreground text-center">Terms and Conditions</h1>

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground">Introduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <p>Welcome to OwnBroker Simplified! These terms and conditions outline the rules and regulations for the use of OwnBroker Simplified's Website, located at [Your Website URL].</p>
            <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use OwnBroker Simplified if you do not agree to take all of the terms and conditions stated on this page.</p>
            {/* Add more sections like Cookies, License, User Comments, Hyperlinking, iFrames, Content Liability, Reservation of Rights, Disclaimer etc. */}
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground">License</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <p>Unless otherwise stated, OwnBroker Simplified and/or its licensors own the intellectual property rights for all material on OwnBroker Simplified. All intellectual property rights are reserved. You may access this from OwnBroker Simplified for your own personal use subjected to restrictions set in these terms and conditions.</p>
            <p>You must not:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Republish material from OwnBroker Simplified</li>
                <li>Sell, rent or sub-license material from OwnBroker Simplified</li>
                <li>Reproduce, duplicate or copy material from OwnBroker Simplified</li>
                <li>Redistribute content from OwnBroker Simplified</li>
            </ul>
            <p>This Agreement shall begin on the date hereof.</p>
            </CardContent>
        </Card>

        {/* Add more Card sections for other terms */}

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground">Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
                    <li>limit or exclude our or your liability for death or personal injury;</li>
                    <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
                    <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
                    <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
                </ul>
                <p>The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.</p>
                <p>As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.</p>
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
